import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Firebase 구성 정보 설정
const firebaseConfig = {
    apiKey: "AIzaSyCFYgoTpp0tfv3Md-a6qMIlJ-4Fc0EHVNQ",
    authDomain: "maechuri-68bb6.firebaseapp.com",
    projectId: "maechuri-68bb6",
    storageBucket: "maechuri-68bb6.firebasestorage.app",
    messagingSenderId: "1086793238742",
    appId: "1:1086793238742:web:c93ca901ac7ebc65082177",
    measurementId: "G-7GXG1B9ZPJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, doc, getDoc, setDoc };
