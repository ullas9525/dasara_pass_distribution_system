// src/firebase.js
import { initializeApp } from "firebase/app";
// optional: only use analytics if HTTPS + production
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBeiQ8dG_4YUkg-3G2LQTWcJ1q5xUptNww",
  authDomain: "dasara-pass-data.firebaseapp.com",
  projectId: "dasara-pass-data",
  storageBucket: "dasara-pass-data.appspot.com",
  messagingSenderId: "1055205777690",
  appId: "1:1055205777690:web:82e0c017de7bd19ccb8ca3",
  measurementId: "G-3XK1S6GG0M"
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // optional

export default app;
