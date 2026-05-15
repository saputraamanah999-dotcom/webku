import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-storage.js';

const firebaseConfig = {
  apiKey: 'ISI_API_KEY_FIREBASE',
  authDomain: 'ISI_AUTH_DOMAIN_FIREBASE',
  projectId: 'ISI_PROJECT_ID_FIREBASE',
  storageBucket: 'ISI_STORAGE_BUCKET_FIREBASE',
  messagingSenderId: 'ISI_MESSAGING_SENDER_ID_FIREBASE',
  appId: 'ISI_APP_ID_FIREBASE'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, storage, googleProvider };
