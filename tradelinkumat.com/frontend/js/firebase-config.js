
const firebaseConfig = {
  apiKey: (typeof window !== 'undefined' && window.ENV && window.ENV.FIREBASE_API_KEY) || "AIzaSyBvOkBH0LbH-BD4R0ExRoHhGciG9b_StBE",
  authDomain: (typeof window !== 'undefined' && window.ENV && window.ENV.FIREBASE_AUTH_DOMAIN) || "tradelink-umat.firebaseapp.com",
  projectId: (typeof window !== 'undefined' && window.ENV && window.ENV.FIREBASE_PROJECT_ID) || "tradelink-umat",
  storageBucket: (typeof window !== 'undefined' && window.ENV && window.ENV.FIREBASE_STORAGE_BUCKET) || "tradelink-umat.appspot.com",
  messagingSenderId: (typeof window !== 'undefined' && window.ENV && window.ENV.FIREBASE_MESSAGING_SENDER_ID) || "123456789012",
  appId: (typeof window !== 'undefined' && window.ENV && window.ENV.FIREBASE_APP_ID) || "1:123456789012:web:abcdef123456789012345678"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

db.settings({
  cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

db.enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
      console.warn('The current browser does not support all of the features required to enable persistence');
    }
  });

window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseStorage = storage;

console.log('Firebase initialized successfully for TradeLink UMAT Campus Market');
