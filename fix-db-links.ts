import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./src/lib/firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const linksSnap = await getDocs(collection(db, "category_links"));
  const postsSnap = await getDocs(collection(db, "posts"));
  
  const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const postSlugs = posts.map(p => p.slug);
  const postIds = posts.map(p => p.id);
  
  for (const d of linksSnap.docs) {
    const l = d.data();
    if (l.url && l.url.startsWith('/post/')) {
      const slug = l.url.replace('/post/', '');
      if (!postSlugs.includes(slug) && !postIds.includes(slug)) {
        console.log("Fixing BROKEN LINK:", l.title, " -> ", l.url);
        const match = posts.find(p => p.slug && p.slug.startsWith(slug));
        if (match) {
          const newUrl = `/post/${match.slug}`;
          console.log("  -> Updating to:", newUrl);
          await updateDoc(doc(db, "category_links", d.id), { url: newUrl });
        }
      }
    }
  }
  process.exit(0);
}
run();
