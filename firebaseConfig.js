import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { browserLocalPersistence, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyD4sHSEMbDI5DTpBkZWzsZrtSEQ3P_PVLI",
  authDomain: "fitfuel-8e4f0.firebaseapp.com",
  projectId: "fitfuel-8e4f0",
  storageBucket: "fitfuel-8e4f0.firebasestorage.app",
  messagingSenderId: "838315157415",
  appId: "1:838315157415:web:10bca544191ff32e677882",
};

const app = initializeApp(firebaseConfig);

// Durable auth so a logged-in session survives an app restart (no re-login).
// Native persists to AsyncStorage; web uses the browser's local persistence.
// getReactNativePersistence only exists in Firebase's RN build and is only
// referenced on native (the web build never reaches that branch).
export const auth = initializeAuth(app, {
  persistence:
    Platform.OS === "web"
      ? browserLocalPersistence
      : getReactNativePersistence(AsyncStorage),
});

// Cloud database — stores workouts/nutrition per user, synced across devices
export const db = getFirestore(app);
