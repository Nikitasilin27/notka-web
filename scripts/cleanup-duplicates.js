import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyASwHZT4ZItbe9uTmf0_D1NLJCD0zVODO0",
  authDomain: "notka-mvp.firebaseapp.com",
  projectId: "notka-mvp"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanup() {
  console.log('Загружаю...');
  const snapshot = await getDocs(query(collection(db, 'scrobbles'), orderBy('timestamp', 'desc')));
  console.log('Найдено:', snapshot.size);
  
  const grouped = new Map();
  snapshot.docs.forEach(d => {
    const data = d.data();
    const key = `${data.odl || data.userId}:${data.trackId || data.title}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({ id: d.id, timestamp: data.timestamp?.toDate() || new Date(), title: data.title });
  });
  
  const toDelete = [];
  grouped.forEach(scrobbles => {
    scrobbles.sort((a, b) => a.timestamp - b.timestamp);
    let last = null;
    scrobbles.forEach((s, i) => {
      if (i === 0) { last = s.timestamp; return; }
      if (s.timestamp - last < 180000) toDelete.push(s);
      else last = s.timestamp;
    });
  });
  
  console.log('Дублей:', toDelete.length);
  if (toDelete.length === 0) return;
  
  for (const d of toDelete) {
    await deleteDoc(doc(db, 'scrobbles', d.id));
    console.log('Удалён:', d.title);
  }
  console.log('Готово!');
}

cleanup();