// firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyAdI5szt9yInh9VobRado8CNR0BnpPWjcY",
  authDomain: "radio-d00a0.firebaseapp.com",
  databaseURL: "https://radio-d00a0-default-rtdb.firebaseio.com",
  projectId: "radio-d00a0",
  storageBucket: "radio-d00a0.firebasestorage.app",
  messagingSenderId: "288118120583",
  appId: "1:288118120583:web:43b0bc945e4db41faf5822",
  measurementId: "G-3N22CWSBSN"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
