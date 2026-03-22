import { getCategoryLinks, getPosts, updateCategoryLink } from "./src/lib/firebaseService";

async function run() {
  const links = await getCategoryLinks();
  const posts = await getPosts();
  const postSlugs = posts.map(p => p.slug);
  const postIds = posts.map(p => p.id);
  
  for (const l of links) {
    if (l.url && l.url.startsWith('/post/')) {
      const slug = l.url.replace('/post/', '');
      if (!postSlugs.includes(slug) && !postIds.includes(slug)) {
        console.log("BROKEN LINK:", l.title, " -> ", l.url);
        // Find a matching post
        const match = posts.find(p => p.slug && p.slug.startsWith(slug));
        if (match) {
          const newUrl = `/post/${match.slug}`;
          console.log("  -> Suggested fix:", newUrl);
          await updateCategoryLink(l.id, { url: newUrl });
          console.log("  -> Fixed!");
        } else {
          console.log("  -> No match found");
        }
      }
    }
  }
  process.exit(0);
}
run();
