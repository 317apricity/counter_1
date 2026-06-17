import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { initializeFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

// 보안 차단망 우회를 위해 HTTP 롱폴링 강제 적용
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false
});

export { db, doc, getDoc, setDoc };
