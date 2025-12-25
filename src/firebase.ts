import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyASwHZT4ZItbe9uTmf0_D1NLJCD0zVODO0",
  authDomain: "notka-mvp.firebaseapp.com",
  projectId: "notka-mvp",
  storageBucket: "notka-mvp.firebasestorage.app",
  messagingSenderId: "732743084893",
  appId: "1:732743084893:web:ae646f664ed4e444e996b4",
  measurementId: "G-W3DT6976Y7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
