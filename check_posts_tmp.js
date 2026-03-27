const admin = require('firebase-admin');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    envConfig[match[1]] = value;
  }
});

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: envConfig.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: envConfig.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: envConfig.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function checkPosts() {
  const postsSnapshot = await db.collection('posts').orderBy('createdAt', 'desc').limit(1).get();
  if (postsSnapshot.empty) {
    fs.writeFileSync('url_tmp.txt', 'No posts found.');
    return;
  }
  const post = postsSnapshot.docs[0].data();
  const url = post.images ? post.images[0] : 'NONE';
  fs.writeFileSync('url_tmp.txt', url);
}

checkPosts().catch(err => {
  fs.writeFileSync('url_tmp.txt', 'ERROR: ' + err.message);
});
