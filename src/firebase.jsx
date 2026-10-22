import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAVgASm8uwkTsry8UY6UIv3ZxR-r1wBulg",
  authDomain: "organizer-65170.firebaseapp.com",
  projectId: "organizer-65170",
  storageBucket: "organizer-65170.firebasestorage.app",
  messagingSenderId: "695008460380",
  appId: "1:695008460380:web:7d3140ea3103535267b099",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);