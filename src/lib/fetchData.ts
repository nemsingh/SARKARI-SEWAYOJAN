import { getCategories, getCategoryLinks, getTabletItems, getPosts, getSiteSettingsFlat, getPostBySlug } from './firebaseService';

export async function fetchStaticOrFirebase(url: string, fallbackFetch: () => Promise<any>) {
  try {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {
    console.warn(`Failed to fetch static JSON from ${url}`, e);
  }
  
  // ONLY fallback to Firebase in development mode.
  // In production, we strictly rely on static JSON to guarantee 0 Firebase reads for users.
  if (import.meta.env.DEV) {
    console.log(`[DEV MODE] Falling back to Firebase for ${url}`);
    return await fallbackFetch();
  } else {
    console.error(`[PROD MODE] Static JSON fetch failed for ${url}. No Firebase fallback allowed to save reads.`);
    return null;
  }
}

export async function fetchHomeData() {
  return fetchStaticOrFirebase('/data.json', async () => {
    const [categories, category_links, tablet_items, posts, settings_flat] = await Promise.all([
      getCategories(),
      getCategoryLinks(),
      getTabletItems(),
      getPosts(),
      getSiteSettingsFlat(),
    ]);
    return { categories, category_links, tablet_items, posts, settings_flat };
  });
}

export async function fetchPostData(slug: string) {
  return fetchStaticOrFirebase(`/data/post_${slug}.json`, async () => {
    const post = await getPostBySlug(slug);
    return post;
  });
}
