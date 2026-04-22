// Firebase configuration and initialization
// These are publishable client-side keys (safe to include in frontend code)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC_Tl9QGjU2jXd_1F_dWxF7XoxhP_9ttyU",
  authDomain: "sarkari-sewayojan.firebaseapp.com",
  projectId: "sarkari-sewayojan",
  storageBucket: "sarkari-sewayojan.firebasestorage.app",
  messagingSenderId: "949119675074",
  appId: "1:949119675074:web:a58f79a40a22e0f768a95b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
