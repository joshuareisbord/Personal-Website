// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAdWPnUzRQ1oOmMVek-mMyZr-RDoqb8NJM",
    authDomain: "personal-website-f17c6.firebaseapp.com",
    projectId: "personal-website-f17c6",
    storageBucket: "personal-website-f17c6.appspot.com",
    messagingSenderId: "452135370019",
    appId: "1:452135370019:web:ca5e40a2086c540409a096",
    measurementId: "G-B8YF940S8Z"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const firestore = getFirestore(app)

export { firebaseConfig, app, analytics, firestore };