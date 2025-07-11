// src/services/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import { initializeAuth } from "firebase/auth";
// ajuste aqui:
import { getReactNativePersistence } from "@firebase/auth/react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

// inicializa o app
const app = initializeApp(firebaseConfig);

// inicializa o Auth COM persistência em AsyncStorage
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// banco de dados Firestore
export const firestore = getFirestore(app);

export default app;
