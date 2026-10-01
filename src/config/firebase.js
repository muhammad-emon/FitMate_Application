import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// on firebase v9 this import comes from the react-native path
import { getReactNativePersistence } from 'firebase/auth/react-native';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDWzE5yd0qUfrQW8AizUWloep-j79lvMYU',
  authDomain: 'fitmate-fe8dd.firebaseapp.com',
  projectId: 'fitmate-fe8dd',
  storageBucket: 'fitmate-fe8dd.firebasestorage.app',
  messagingSenderId: '962340042077',
  appId: '1:962340042077:web:2938496c38602da12724b4',
};

let app;
let auth;

// fast refresh runs this file again, and initializing twice throws an error,
// so only set things up if there is no app yet
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    // keeps the user logged in after the app is closed
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
