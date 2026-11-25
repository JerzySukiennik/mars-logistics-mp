// Firebase web app config for Mars Logistics. Web config values are public by design;
// security is enforced by Realtime Database rules.
export const firebaseConfig = {
  apiKey: "AIzaSyCSbZ6zO4cysG-fDk0IG0Y5d2lSpqxuhq0",
  authDomain: "mars-logistics-mp.firebaseapp.com",
  databaseURL: "https://mars-logistics-mp-default-rtdb.firebaseio.com",
  projectId: "mars-logistics-mp",
  storageBucket: "mars-logistics-mp.firebasestorage.app",
  messagingSenderId: "370732341492",
  appId: "1:370732341492:web:7cb7578208180e3e14a6a1"
};
export const FIREBASE_READY = () =>
  !!(firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.appId);
