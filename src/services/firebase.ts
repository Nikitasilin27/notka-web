import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  query, 
  orderBy, 
  limit, 
  getDocs,
  where,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { User, Scrobble } from '../types';

// User operations
export async function getUser(odl: string): Promise<User | null> {
  const docRef = doc(db, 'users', odl);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  return {
    ...data,
    odl: docSnap.id,
    lastUpdated: data.lastUpdated?.toDate(),
    currentTrack: data.currentTrack ? {
      ...data.currentTrack,
      timestamp: data.currentTrack.timestamp?.toDate()
    } : undefined
  } as User;
}

export async function createOrUpdateUser(userData: Partial<User> & { odl: string }): Promise<void> {
  const docRef = doc(db, 'users', userData.odl);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    // Update existing user
    await updateDoc(docRef, {
      ...userData,
      lastUpdated: Timestamp.now()
    });
  } else {
    // Create new user
    await setDoc(docRef, {
      ...userData,
      lastUpdated: Timestamp.now()
    });
  }
}

export async function updateCurrentTrack(
  odl: string, 
  track: { trackId: string; trackName: string; artistName: string; albumArtURL?: string } | null
): Promise<void> {
  const docRef = doc(db, 'users', odl);
  
  await updateDoc(docRef, {
    currentTrack: track ? {
      ...track,
      timestamp: Timestamp.now()
    } : null,
    lastUpdated: Timestamp.now()
  });
}

// ============ Followers functionality ============

// Document ID format: {followerId}_{followingId}
function getFollowDocId(followerId: string, followingId: string): string {
  return `${followerId}_${followingId}`;
}

// Check if user A follows user B
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const docId = getFollowDocId(followerId, followingId);
  const docRef = doc(db, 'followers', docId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}

// Follow a user
export async function followUser(followerId: string, followingId: string): Promise<void> {
  const docId = getFollowDocId(followerId, followingId);
  const docRef = doc(db, 'followers', docId);
  
  await setDoc(docRef, {
    followerId,
    followingId,
    createdAt: Timestamp.now()
  });
}

// Unfollow a user
export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const docId = getFollowDocId(followerId, followingId);
  const docRef = doc(db, 'followers', docId);
  await deleteDoc(docRef);
}

// Get list of user IDs that a user follows
export async function getFollowing(userId: string): Promise<string[]> {
  const followersRef = collection(db, 'followers');
  const q = query(
    followersRef,
    where('followerId', '==', userId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data().followingId);
}

// Get list of user IDs that follow a user
export async function getFollowers(userId: string): Promise<string[]> {
  const followersRef = collection(db, 'followers');
  const q = query(
    followersRef,
    where('followingId', '==', userId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data().followerId);
}

// Get follower/following counts
export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [followers, following] = await Promise.all([
    getFollowers(userId),
    getFollowing(userId)
  ]);
  
  return {
    followers: followers.length,
    following: following.length
  };
}

// Get scrobbles from users that someone follows
export async function getFollowingScrobbles(userId: string, limitCount = 50): Promise<Scrobble[]> {
  const followingIds = await getFollowing(userId);
  
  if (followingIds.length === 0) {
    return [];
  }
  
  // Get recent scrobbles and filter by following list
  const scrobblesRef = collection(db, 'scrobbles');
  const q = query(
    scrobblesRef,
    orderBy('timestamp', 'desc'),
    limit(300) // Get more to filter
  );
  
  const snapshot = await getDocs(q);
  
  const followingScrobbles = snapshot.docs
    .map(doc => docToScrobble(doc))
    .filter(s => followingIds.includes(s.odl) || followingIds.includes(s.userId || ''));
  
  return followingScrobbles.slice(0, limitCount);
}

// Scrobble operations - совместимы с iOS структурой
export async function addScrobble(scrobble: Omit<Scrobble, 'id'>): Promise<string | null> {
  // Check for duplicate first (same user, same track, within last 3 minutes)
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
  const scrobblesRef = collection(db, 'scrobbles');
  
  // Use odl (Spotify ID) as user identifier
  const odl = scrobble.odl;
  
  // Check duplicates by both odl and userId fields
  try {
    // Check by odl
    const duplicateCheckOdl = query(
      scrobblesRef,
      where('odl', '==', odl),
      where('trackId', '==', scrobble.trackId),
      where('timestamp', '>=', Timestamp.fromDate(threeMinutesAgo)),
      limit(1)
    );
    
    const existingOdl = await getDocs(duplicateCheckOdl);
    if (!existingOdl.empty) {
      console.log('Duplicate scrobble prevented (odl):', scrobble.title);
      return null;
    }
    
    // Also check by userId (iOS compatibility)
    const duplicateCheckUserId = query(
      scrobblesRef,
      where('userId', '==', odl),
      where('trackId', '==', scrobble.trackId),
      where('timestamp', '>=', Timestamp.fromDate(threeMinutesAgo)),
      limit(1)
    );
    
    const existingUserId = await getDocs(duplicateCheckUserId);
    if (!existingUserId.empty) {
      console.log('Duplicate scrobble prevented (userId):', scrobble.title);
      return null;
    }
  } catch (e) {
    // Index might not exist, continue with scrobble
    console.log('Duplicate check skipped (index missing)');
  }
  
  const docRef = await addDoc(scrobblesRef, {
    // Core fields (iOS-compatible)
    title: scrobble.title,
    artist: scrobble.artist,
    album: scrobble.album,
    duration: scrobble.duration,
    timestamp: Timestamp.fromDate(scrobble.timestamp),
    scrobbledAt: Timestamp.fromDate(scrobble.timestamp),
    // User identifier - write BOTH for iOS/web compatibility
    odl: odl,
    userId: odl,
    // Web-specific fields
    trackId: scrobble.trackId,
    albumArtURL: scrobble.albumArtURL,
  });
  return docRef.id;
}

// Преобразование документа в Scrobble (поддержка iOS и веб форматов)
function docToScrobble(doc: any): Scrobble {
  const data = doc.data();
  return {
    id: doc.id,
    odl: data.odl || data.userId || '',
    userId: data.userId,
    trackId: data.trackId,
    // Поддержка обоих форматов имён полей
    title: data.title || data.trackName || '',
    artist: data.artist || data.artistName || '',
    album: data.album || data.albumName,
    albumArtURL: data.albumArtURL,
    timestamp: data.timestamp?.toDate() || data.scrobbledAt?.toDate() || new Date(),
    scrobbledAt: data.scrobbledAt?.toDate(),
    duration: data.duration
  };
}

export async function getUserScrobbles(odl: string, limitCount = 20): Promise<Scrobble[]> {
  const scrobblesRef = collection(db, 'scrobbles');
  
  // Query by userId (iOS format) - more reliable if index exists
  try {
    const qUserId = query(
      scrobblesRef,
      where('userId', '==', odl),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshotUserId = await getDocs(qUserId);
    if (!snapshotUserId.empty) {
      return snapshotUserId.docs.map(doc => docToScrobble(doc));
    }
  } catch {
    // Index might not exist
  }
  
  // Fallback: Query by odl (web format)
  try {
    const qOdl = query(
      scrobblesRef,
      where('odl', '==', odl),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshotOdl = await getDocs(qOdl);
    if (!snapshotOdl.empty) {
      return snapshotOdl.docs.map(doc => docToScrobble(doc));
    }
  } catch {
    // Index might not exist
  }
  
  // Final fallback: Get recent scrobbles and filter client-side
  const q = query(
    scrobblesRef,
    orderBy('timestamp', 'desc'),
    limit(500)
  );
  
  const snapshot = await getDocs(q);
  
  const userScrobbles = snapshot.docs
    .map(doc => docToScrobble(doc))
    .filter(s => s.odl === odl || s.userId === odl);
  
  return userScrobbles.slice(0, limitCount);
}

// Check if user recently scrobbled this track (to prevent duplicates)
export async function getRecentUserScrobble(odl: string, trackId: string): Promise<Scrobble | null> {
  const scrobblesRef = collection(db, 'scrobbles');
  const q = query(
    scrobblesRef,
    where('odl', '==', odl),
    where('trackId', '==', trackId),
    orderBy('timestamp', 'desc'),
    limit(1)
  );
  
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return docToScrobble(snapshot.docs[0]);
  } catch {
    // Index might not exist, return null
    return null;
  }
}

export async function getRecentScrobbles(limitCount = 50): Promise<Scrobble[]> {
  const scrobblesRef = collection(db, 'scrobbles');
  const q = query(
    scrobblesRef,
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => docToScrobble(doc));
}

export async function getAllUsers(limitCount = 50): Promise<User[]> {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    orderBy('lastUpdated', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      odl: doc.id,
      lastUpdated: data.lastUpdated?.toDate(),
      currentTrack: data.currentTrack ? {
        ...data.currentTrack,
        timestamp: data.currentTrack.timestamp?.toDate()
      } : undefined
    };
  }) as User[];
}

// Firebase Auth (optional, for future use)
export async function signInToFirebase(customToken: string): Promise<void> {
  await signInWithCustomToken(auth, customToken);
}

export async function signOutFromFirebase(): Promise<void> {
  await signOut(auth);
}

export function getCurrentFirebaseUser() {
  return auth.currentUser;
}
