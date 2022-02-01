// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAdWPnUzRQ1oOmMVek-mMyZr-RDoqb8NJM",
  authDomain: "personal-website-f17c6.firebaseapp.com",
  projectId: "personal-website-f17c6",
  storageBucket: "personal-website-f17c6.appspot.com",
  messagingSenderId: "452135370019",
  appId: "1:452135370019:web:0b3be55582dd284809a096",
  measurementId: "G-4LX7S6BCN5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app)
const firestore = getFirestore(app)

// if the enviroment is development, then we connect to our firebase emulators.
// if (process.env.NODE_ENV === 'development') {
//     connectFirestoreEmulator(firestore, 'localhost', 8080);
//     connectAuthEmulator(auth, 'http://localhost:9099');
// }

export { firebaseConfig, app, analytics, auth, firestore };