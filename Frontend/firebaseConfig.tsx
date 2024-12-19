// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectAuthEmulator } from 'firebase/auth';

// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyCQ7FAbL8oZCNmqyiG5vHRZBE9Vr3-olCQ",
  authDomain: "villagecare-f1b0c.firebaseapp.com",
  projectId: "villagecare-f1b0c",
  storageBucket: "villagecare-f1b0c.firebasestorage.app",
  messagingSenderId: "181518015270",
  appId: "1:181518015270:web:54137bb8e6322e1f8effe7",
  measurementId: "G-FMHTTCZH0L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
// Initialize Firebaser
// Connect to the Firestore Emulator
connectFirestoreEmulator(db, '127.0.0.1', 8080);

export { db };

const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9150'); // Replace with your emulator port

export { auth };