// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, browserPopupRedirectResolver } from "firebase/auth";     // ✅ MUST be imported
import { getFirestore } from "firebase/firestore"; // ✅ MUST be imported
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCHfH_Asfa3Kx0tgRPyO8VNQlAzsI8emVI",
    authDomain: "worklog-6fe1a.firebaseapp.com",
    projectId: "worklog-6fe1a",
    storageBucket: "worklog-6fe1a.firebasestorage.app",
    messagingSenderId: "33974334378",
    appId: "1:33974334378:web:47a1b18cf4e7270731b1d3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence, browserPopupRedirectResolver);
export const db = getFirestore(app);