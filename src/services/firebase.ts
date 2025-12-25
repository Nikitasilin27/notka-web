import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
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

// Scrobble operations - совместимы с iOS структурой
export async function addScrobble(scrobble: Omit<Scrobble, 'id'>): Promise<string | null> {
  // Check for duplicate first (same user, same track, within last 3 minutes)
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
  const scrobblesRef = collection(db, 'scrobbles');
  
  try {
    const duplicateCheck = query(
      scrobblesRef,
      where('odl', '==', scrobble.odl),
      where('trackId', '==', scrobble.trackId),
      where('timestamp', '>=', Timestamp.fromDate(threeMinutesAgo)),
      limit(1)
    );
    
    const existing = await getDocs(duplicateCheck);
    if (!existing.empty) {
      console.log('Duplicate scrobble prevented:', scrobble.title);
      return null; // Already scrobbled recently
    }
  } catch (e) {
    // Index might not exist, continue with scrobble
    console.log('Duplicate check skipped (index missing)');
  }
  
  const docRef = await addDoc(scrobblesRef, {
    // Сохраняем в формате iOS
    title: scrobble.title,
    artist: scrobble.artist,
    album: scrobble.album,
    // Плюс веб-специфичные поля
    odl: scrobble.odl,
    trackId: scrobble.trackId,
    albumArtURL: scrobble.albumArtURL,
    duration: scrobble.duration,
    timestamp: Timestamp.fromDate(scrobble.timestamp),
    scrobbledAt: Timestamp.fromDate(scrobble.timestamp)
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
  
  // Пробуем найти по odl (веб) 
  let q = query(
    scrobblesRef,
    where('odl', '==', odl),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  
  let snapshot = await getDocs(q);
  
  // Если не нашли, ищем по odl в users чтобы получить odl юзера
  // и затем ищем скробблы
  if (snapshot.empty) {
    // Получаем все скробблы и фильтруем (временное решение)
    const allQ = query(
      scrobblesRef,
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    snapshot = await getDocs(allQ);
    
    const filtered = snapshot.docs
      .map(doc => docToScrobble(doc))
      .filter(s => s.odl === odl);
    
    return filtered.slice(0, limitCount);
  }
  
  return snapshot.docs.map(doc => docToScrobble(doc));
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
