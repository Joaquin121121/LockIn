import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase configuration - no need for environment variables since
// you'll be the only user and credentials aren't sensitive for this use case
const firebaseConfig = {
  apiKey: "AIzaSyCxb3sf2VpP6RbZDCjHd5J6wkO1LsntqrI",
  authDomain: "lockintimer.firebaseapp.com",
  projectId: "lockintimer",
  storageBucket: "lockintimer.firebasestorage.app",
  messagingSenderId: "917653885050",
  appId: "1:917653885050:web:6885453ff30c54bdf1abc3",
  measurementId: "G-WT5D1ZYTDC",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

export { db };
