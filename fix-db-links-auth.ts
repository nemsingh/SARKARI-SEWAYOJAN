import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
import fs from "fs";

const config = {
  apiKey: "AIzaSyC_Tl9QGjU2jXd_1F_dWxF7XoxhP_9ttyU",
  authDomain: "sarkari-sewayojan.firebaseapp.com",
  projectId: "sarkari-sewayojan",
  storageBucket: "sarkari-sewayojan.firebasestorage.app",
  messagingSenderId: "949119675074",
  appId: "1:949119675074:web:a58f79a40a22e0f768a95b"
};
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const parseDateTime = (dateString: string, lang: 'en' | 'hi' = 'en'): Date | undefined => {
  if (!dateString) return undefined;
  let d = new Date(dateString);
  if (!isNaN(d.getTime())) return d;
  const noPipe = dateString.replace('|', '');
  d = new Date(noPipe);
  if (!isNaN(d.getTime())) return d;
  try {
    const parts = dateString.split('|').map(p => p.trim());
    if (parts.length !== 2) return undefined;
    const dateTokens = parts[0].split(' ');
    if (dateTokens.length < 3) return undefined;
    const day = parseInt(dateTokens[0], 10);
    const monthStr = dateTokens[1];
    const year = parseInt(dateTokens[2], 10);
    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthsHi = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
    const monthIndex = lang === 'hi' ? monthsHi.indexOf(monthStr) : monthsEn.indexOf(monthStr);
    if (monthIndex === -1) return undefined;
    const timeTokens = parts[1].split(' ');
    if (timeTokens.length !== 2) return undefined;
    const timeParts = timeTokens[0].split(':');
    if (timeParts.length !== 2) return undefined;
    let hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const ampm = timeTokens[1].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return new Date(year, monthIndex, day, hours, minutes);
  } catch (e) {
    return undefined;
  }
};

async function run() {
  console.log("Signing in...");
  // Use the admin credentials
  await signInWithEmailAndPassword(auth, "vikaskumar12121999@gmail.com", "Vikas@123");
  console.log("Signed in successfully. Fetching data...");
  
  const linksSnap = await getDocs(collection(db, "category_links"));
  const postsSnap = await getDocs(collection(db, "posts"));
  
  const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  
  for (const d of linksSnap.docs) {
    const l = d.data();
    if (l.url && l.url.startsWith('/post/')) {
      const slug = l.url.replace('/post/', '');
      
      const match = posts.find(p => p.slug === slug || (p.slug && p.slug.startsWith(slug)) || p.id === slug);
      if (match) {
        let updateRequired = false;
        const updates: any = {};
        
        if (match.post_date && match.post_date !== l.post_date) {
            updates.post_date = match.post_date;
            updateRequired = true;
        }

        if (match.last_date_text && match.last_date_text !== l.last_date_text) {
            updates.last_date_text = match.last_date_text;
            updateRequired = true;
        }

        const postTimestampForLink = match.post_date ? (parseDateTime(match.post_date, 'en')?.getTime() || match.post_timestamp) : match.post_timestamp;
        
        if (postTimestampForLink && postTimestampForLink !== l.link_timestamp && Math.abs(postTimestampForLink - (l.link_timestamp || 0)) > 1000) {
            updates.link_timestamp = postTimestampForLink;
            updateRequired = true;
        }
        
        if (updateRequired) {
          console.log(`Updating link="${l.title}" for POST="${match.name_of_post}"`);
          console.log(updates);
          await updateDoc(doc(db, "category_links", d.id), updates);
          await delay(100);
        }
      }
    }
  }
  console.log("Done syncing existing dates.");
  process.exit(0);
}

run().catch(console.error);
