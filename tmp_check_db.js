
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCollections() {
  const collections = ['users', 'groups', 'expenses', 'chatRooms', 'messages'];
  
  for (const colName of collections) {
    try {
      console.log(`\n--- Checking Collection: ${colName} ---`);
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      console.log(`Total documents: ${snapshot.size}`);
      
      snapshot.docs.slice(0, 5).forEach(doc => {
        console.log(`ID: ${doc.id}`, JSON.stringify(doc.data(), null, 2));
      });
      
      if (snapshot.size > 5) {
        console.log('... and more');
      }
    } catch (error) {
      console.error(`Error checking ${colName}:`, error.message);
    }
  }
}

checkCollections().then(() => process.exit(0));
