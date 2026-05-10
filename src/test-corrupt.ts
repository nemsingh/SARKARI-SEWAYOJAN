import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query, where } from 'firebase/firestore';
import LZString from 'lz-string';

const firebaseConfig = {
  authDomain: "sarkari-sewayojan.firebaseapp.com",
  projectId: "sarkari-sewayojan",
  storageBucket: "sarkari-sewayojan.firebasestorage.app",
  messagingSenderId: "157365262219",
  appId: "1:157365262219:web:15de7fc0e77d2fe9418659"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const q = query(collection(db, 'posts'), limit(5));
  const snap = await getDocs(q);
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.tables_html && data.tables_html.startsWith('LZ16:')) {
      const comp = data.tables_html.substring(5);
      console.log('Post ID:', d.id);
      console.log('Length:', comp.length);
      console.log('Contains FFFD?', comp.includes('\uFFFD'));
      const decomp = LZString.decompressFromUTF16(comp);
      console.log('Decompressed successfully?', !!decomp);
      if (!decomp) {
        // let's try other decompression methods?
        console.log('Try decodeURIComponent?', !!LZString.decompressFromEncodedURIComponent(comp));
      } else {
        console.log('First 50 chars of decompressed:', decomp.substring(0, 50));
        console.log('First 50 chars of raw LZ16:', comp.substring(0, 50));
      }
    }
  });
  console.log("Done");
  process.exit(0);
}
check();
