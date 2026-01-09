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
  addDoc,
  writeBatch,
  onSnapshot,
  increment
} from 'firebase/firestore';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { User, Scrobble } from '../types';
import { logger } from '../utils/logger';

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
  
  // Filter out undefined values - Firebase doesn't accept them
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(userData)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }
  
  if (docSnap.exists()) {
    // Update existing user
    await updateDoc(docRef, {
      ...cleanData,
      lastUpdated: Timestamp.now()
    });
  } else {
    // Create new user
    await setDoc(docRef, {
      ...cleanData,
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

  const scrobblesRef = collection(db, 'scrobbles');

  // Firestore 'in' operator supports up to 10 values, so batch queries if needed
  const batchSize = 10;
  const allScrobbles: Scrobble[] = [];

  for (let i = 0; i < followingIds.length; i += batchSize) {
    const batch = followingIds.slice(i, i + batchSize);

    const q = query(
      scrobblesRef,
      where('odl', 'in', batch),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const batchScrobbles = snapshot.docs.map(doc => docToScrobble(doc));
    allScrobbles.push(...batchScrobbles);
  }

  // Sort all results by timestamp and limit
  return allScrobbles
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limitCount);
}

// Scrobble operations - совместимы с iOS структурой
export async function addScrobble(scrobble: Omit<Scrobble, 'id'>): Promise<string | null> {
  const scrobblesRef = collection(db, 'scrobbles');
  const odl = scrobble.odl;
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000; // Increased to 5 min
  
  // Duplicate check - use proper query to get only this user's recent scrobbles
  try {
    const recentQuery = query(
      scrobblesRef,
      where('odl', '==', odl),
      where('timestamp', '>', Timestamp.fromMillis(fiveMinutesAgo)),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(recentQuery);

    // Check if this exact track was scrobbled in last 5 minutes
    const isDuplicate = snapshot.docs.some(doc => {
      const data = doc.data();
      return data.trackId === scrobble.trackId;
    });

    if (isDuplicate) {
      logger.log('⏭ Duplicate prevented (Firebase check):', scrobble.title);
      return null;
    }

    // Also check if this EXACT timestamp already exists (same scrobble)
    const sameTimestamp = snapshot.docs.some(doc => {
      const data = doc.data();
      const docTimestamp = data.timestamp?.toMillis() || 0;
      return data.trackId === scrobble.trackId &&
        Math.abs(docTimestamp - scrobble.timestamp.getTime()) < 60000; // Within 1 minute
    });

    if (sameTimestamp) {
      logger.log('⏭ Same timestamp duplicate prevented:', scrobble.title);
      return null;
    }
  } catch (e) {
    logger.log('Duplicate check error, proceeding with caution:', e);
    // If we can't check, don't add - better safe than duplicate
    return null;
  }
  
  // Add the scrobble - filter out undefined values
  const scrobbleData: Record<string, unknown> = {
    // Core fields (iOS-compatible)
    title: scrobble.title,
    artist: scrobble.artist,
    timestamp: Timestamp.fromDate(scrobble.timestamp),
    scrobbledAt: Timestamp.fromDate(scrobble.timestamp),
    // User identifier - write BOTH for iOS/web compatibility
    odl: odl,
    userId: odl,
    // Like fields
    isLikedOnSpotify: scrobble.isLikedOnSpotify || false,
    likesCount: 0,
  };
  
  // Add optional fields only if they have values
  if (scrobble.album) scrobbleData.album = scrobble.album;
  if (scrobble.duration) scrobbleData.duration = scrobble.duration;
  if (scrobble.trackId) scrobbleData.trackId = scrobble.trackId;
  if (scrobble.artistId) scrobbleData.artistId = scrobble.artistId;
  if (scrobble.albumArtURL) scrobbleData.albumArtURL = scrobble.albumArtURL;
  
  const docRef = await addDoc(scrobblesRef, scrobbleData);

  // Increment user's scrobbles count
  try {
    const userRef = doc(db, 'users', odl);
    await updateDoc(userRef, {
      scrobblesCount: increment(1)
    });
  } catch (error) {
    logger.error('Error incrementing scrobbles count:', error);
    // Don't fail the scrobble if counter update fails
  }

  logger.log('✓ Scrobbled:', scrobble.title);
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
    artistId: data.artistId,
    // Поддержка обоих форматов имён полей
    title: data.title || data.trackName || '',
    artist: data.artist || data.artistName || '',
    album: data.album || data.albumName,
    albumArtURL: data.albumArtURL,
    timestamp: data.timestamp?.toDate() || data.scrobbledAt?.toDate() || new Date(),
    scrobbledAt: data.scrobbledAt?.toDate(),
    duration: data.duration,
    // Like fields
    isLikedOnSpotify: data.isLikedOnSpotify || false,
    likesCount: data.likesCount || 0,
  };
}

// Get user's last scrobble (for duplicate prevention on page reload)
export async function getLastUserScrobble(odl: string): Promise<Scrobble | null> {
  const scrobblesRef = collection(db, 'scrobbles');

  const q = query(
    scrobblesRef,
    where('odl', '==', odl),
    orderBy('timestamp', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  return docToScrobble(snapshot.docs[0]);
}

export async function getUserScrobbles(odl: string, limitCount = 20): Promise<Scrobble[]> {
  const scrobblesRef = collection(db, 'scrobbles');

  // Use proper query with where clause to get only user's scrobbles
  const q = query(
    scrobblesRef,
    where('odl', '==', odl),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => docToScrobble(doc));
}

// Get a single scrobble by ID
export async function getScrobbleById(scrobbleId: string): Promise<Scrobble | null> {
  const scrobblesRef = collection(db, 'scrobbles');
  const scrobbleDoc = await getDoc(doc(scrobblesRef, scrobbleId));

  if (!scrobbleDoc.exists()) {
    return null;
  }

  return docToScrobble(scrobbleDoc);
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

// ============================================
// LIKES
// ============================================

export interface Like {
  id: string;
  odl: string;
  odlName: string;
  odlAvatar?: string;
  scrobbleId: string;
  trackId: string;
  trackName: string;
  artistName: string;
  albumArtURL?: string;
  ownerOdl: string;
  timestamp: Date;
}

/**
 * Like a scrobble
 */
export async function likeScrobble(
  scrobble: Scrobble,
  liker: { odl: string; name: string; avatar?: string }
): Promise<string> {
  const likeId = `${liker.odl}_${scrobble.id}`;
  const likeRef = doc(db, 'likes', likeId);
  
  await setDoc(likeRef, {
    odl: liker.odl,
    odlName: liker.name,
    odlAvatar: liker.avatar || null,
    scrobbleId: scrobble.id,
    trackId: scrobble.trackId || '',
    trackName: scrobble.title,
    artistName: scrobble.artist,
    albumArtURL: scrobble.albumArtURL || null,
    ownerOdl: scrobble.odl,
    timestamp: Timestamp.now(),
  });
  
  return likeId;
}

/**
 * Unlike a scrobble
 */
export async function unlikeScrobble(odl: string, scrobbleId: string): Promise<void> {
  const likeId = `${odl}_${scrobbleId}`;
  const likeRef = doc(db, 'likes', likeId);
  await deleteDoc(likeRef);
}

/**
 * Check if user has liked a scrobble
 */
export async function hasLikedScrobble(odl: string, scrobbleId: string): Promise<boolean> {
  const likeId = `${odl}_${scrobbleId}`;
  const likeRef = doc(db, 'likes', likeId);
  const likeDoc = await getDoc(likeRef);
  return likeDoc.exists();
}

/**
 * Check multiple likes at once (for feed)
 */
export async function checkLikedScrobbles(odl: string, scrobbleIds: string[]): Promise<Set<string>> {
  const likedIds = new Set<string>();
  
  // Check in batches of 10 (Firestore limit for 'in' queries doesn't apply here, but batch for performance)
  const batchSize = 10;
  for (let i = 0; i < scrobbleIds.length; i += batchSize) {
    const batch = scrobbleIds.slice(i, i + batchSize);
    const promises = batch.map(async (scrobbleId) => {
      const isLiked = await hasLikedScrobble(odl, scrobbleId);
      if (isLiked) likedIds.add(scrobbleId);
    });
    await Promise.all(promises);
  }
  
  return likedIds;
}

/**
 * Get likes for a scrobble
 */
export async function getScrobbleLikes(scrobbleId: string): Promise<Like[]> {
  const likesRef = collection(db, 'likes');
  const q = query(
    likesRef,
    where('scrobbleId', '==', scrobbleId),
    orderBy('timestamp', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate() || new Date()
  })) as Like[];
}

/**
 * Get user's liked scrobbles
 */
export async function getUserLikes(odl: string, limitCount = 50): Promise<Like[]> {
  const likesRef = collection(db, 'likes');
  const q = query(
    likesRef,
    where('odl', '==', odl),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate() || new Date()
  })) as Like[];
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface Notification {
  id: string;
  odl: string;
  type: 'like' | 'follow' | 'suggestion';
  fromOdl: string;
  fromName: string;
  fromAvatar?: string;
  data: {
    scrobbleId?: string;
    trackName?: string;
    artistName?: string;
    suggestionId?: string;
  };
  read: boolean;
  timestamp: Date;
}

/**
 * Get user's notifications
 */
export async function getUserNotifications(odl: string, limitCount = 50): Promise<Notification[]> {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('odl', '==', odl),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate() || new Date()
  })) as Notification[];
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(odl: string): Promise<number> {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('odl', '==', odl),
    where('read', '==', false)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const notificationRef = doc(db, 'notifications', notificationId);
  await updateDoc(notificationRef, { read: true });
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const notificationRef = doc(db, 'notifications', notificationId);
  await deleteDoc(notificationRef);
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(odl: string): Promise<void> {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('odl', '==', odl),
    where('read', '==', false)
  );
  
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { read: true });
  });
  
  await batch.commit();
}

/**
 * Subscribe to notifications (real-time)
 */
export function subscribeToNotifications(
  odl: string,
  callback: (notifications: Notification[]) => void
): () => void {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('odl', '==', odl),
    orderBy('timestamp', 'desc'),
    limit(50)
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date()
    })) as Notification[];
    callback(notifications);
  });
}

// ============================================
// REAL-TIME SCROBBLES SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to recent scrobbles (real-time)
 */
export function subscribeToRecentScrobbles(
  limitCount: number,
  callback: (scrobbles: Scrobble[]) => void
): () => void {
  const scrobblesRef = collection(db, 'scrobbles');
  const q = query(
    scrobblesRef,
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const scrobbles = snapshot.docs.map(doc => docToScrobble(doc));
    callback(scrobbles);
  });
}

/**
 * Subscribe to user's scrobbles (real-time)
 */
export function subscribeToUserScrobbles(
  odl: string,
  limitCount: number,
  callback: (scrobbles: Scrobble[]) => void
): () => void {
  const scrobblesRef = collection(db, 'scrobbles');

  // Use proper query with where clause to get only user's scrobbles
  const q = query(
    scrobblesRef,
    where('odl', '==', odl),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const userScrobbles = snapshot.docs.map(doc => docToScrobble(doc));
    callback(userScrobbles);
  });
}

/**
 * Subscribe to following scrobbles (real-time)
 */
export function subscribeToFollowingScrobbles(
  userId: string,
  limitCount: number,
  callback: (scrobbles: Scrobble[]) => void
): () => void {
  const unsubscribers: Array<() => void> = [];

  // Get following list and set up listeners
  getFollowing(userId).then(followingIds => {
    if (followingIds.length === 0) {
      callback([]);
      return;
    }

    const scrobblesRef = collection(db, 'scrobbles');
    const batchSize = 10;
    const allScrobbles: Scrobble[] = [];

    // Create listeners for each batch
    for (let i = 0; i < followingIds.length; i += batchSize) {
      const batch = followingIds.slice(i, i + batchSize);

      const q = query(
        scrobblesRef,
        where('odl', 'in', batch),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        // Update scrobbles for this batch
        const batchScrobbles = snapshot.docs.map(doc => docToScrobble(doc));

        // Remove old scrobbles from this batch
        const batchUserIds = new Set(batch);
        const filteredScrobbles = allScrobbles.filter(s => !batchUserIds.has(s.odl));

        // Add new scrobbles
        filteredScrobbles.push(...batchScrobbles);

        // Sort and limit
        const sortedScrobbles = filteredScrobbles
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, limitCount);

        // Update allScrobbles
        allScrobbles.length = 0;
        allScrobbles.push(...sortedScrobbles);

        callback(sortedScrobbles);
      });

      unsubscribers.push(unsubscribe);
    }
  });

  // Return function that unsubscribes from all listeners
  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}

/**
 * Subscribe to active users (real-time)
 * Shows users active in last 24 hours with live currentTrack updates
 */
export function subscribeToActiveUsers(
  currentUserId: string | null,
  callback: (users: User[]) => void
): () => void {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    orderBy('lastUpdated', 'desc'),
    limit(50) // Get top 50 recently active users
  );

  return onSnapshot(q, (snapshot) => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000; // 24 hours in ms

    const activeUsers = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          ...data,
          odl: doc.id,
          lastUpdated: data.lastUpdated?.toDate(),
          currentTrack: data.currentTrack ? {
            ...data.currentTrack,
            timestamp: data.currentTrack.timestamp?.toDate()
          } : undefined
        } as User;
      })
      .filter(user => {
        // Exclude current user
        if (user.odl === currentUserId) return false;

        // Only show users active in last 24 hours
        if (!user.lastUpdated) return false;
        return user.lastUpdated.getTime() >= twentyFourHoursAgo;
      });

    callback(activeUsers);
  });
}
