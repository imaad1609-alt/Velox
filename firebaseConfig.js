import { initializeApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD4sHSEMbDI5DTpBkZWzsZrtSEQ3P_PVLI",
  authDomain: "fitfuel-8e4f0.firebaseapp.com",
  projectId: "fitfuel-8e4f0",
  storageBucket: "fitfuel-8e4f0.firebasestorage.app",
  messagingSenderId: "838315157415",
  appId: "1:838315157415:web:10bca544191ff32e677882",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: inMemoryPersistence,
});
