const firebaseConfig = {
  apiKey: "AIzaSyBlO7XTiLA16gqtXXEnYYS-q0ytLxDEDYk",
  authDomain: "money-tracker-mkhairultegar.firebaseapp.com",
  databaseURL: "https://money-tracker-mkhairultegar-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "money-tracker-mkhairultegar",
  storageBucket: "money-tracker-mkhairultegar.firebasestorage.app",
  messagingSenderId: "41631315085",
  appId: "1:41631315085:web:fed6c1846b93ff3cac9ec4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Firestore settings (optional)
db.settings({
  cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Enable offline persistence (optional)
db.enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.log('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
    } else if (err.code == 'unimplemented') {
      console.log('The current browser does not support all of the features required to enable persistence');
    }
  });

// Export for use in other files (if using modules)
// export { auth, db };
