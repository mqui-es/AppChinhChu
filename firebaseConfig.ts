import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyBJ9UhdejvlE-cOBdeOIHCIl8pgSbUTwgs",
  authDomain: "ipaviet-st.firebaseapp.com",
  projectId: "ipaviet-st",
  storageBucket: "ipaviet-st.firebasestorage.app",
  messagingSenderId: "127619650916",
  appId: "1:127619650916:web:fc8904c99804eeb7539671",
  measurementId: "G-NLL8W9829B"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let auth: any;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  // Ép ẩn hàm này khỏi Web để không bị màn hình đỏ
  // @ts-ignore
  const { getReactNativePersistence } = require('firebase/auth');
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

export { auth };
export const db = getFirestore(app);