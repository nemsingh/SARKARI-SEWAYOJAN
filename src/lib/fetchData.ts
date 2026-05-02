import * as firebaseService from './firebaseService';

export async function fetchStaticOrFirebase(url: string, fallbackFetch: () => Promise<any>) {
  // In development, directly hit Firebase to ensure live preview works after Admin edits.
  if (import.meta.env.DEV) {
    console.log(`[DEV MODE] Fetching live data from Firebase for ${url}`);
    return await fallbackFetch();
  }

  // In production, we strictly rely on static JSON to guarantee 0 Firebase reads for users.
  try {
    // Add cache-busting timestamp to prevent stale static files from being served by the browser
    const cacheBuster = `?t=${Date.now()}`;
    const res = await fetch(`${url}${cacheBuster}`);
    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {
    console.warn(`Failed to fetch static JSON from ${url}`, e);
  }
  
  console.error(`[PROD MODE] Static JSON fetch failed for ${url}. No Firebase fallback allowed to save reads.`);
  return null;
}

export async function fetchHomeData() {
  return fetchStaticOrFirebase('/data.json', async () => {
    const { getCategories, getCategoryLinks, getTabletItems, getPosts, getSiteSettingsFlat } = firebaseService;
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
    const { getPostBySlug } = firebaseService;
    const post = await getPostBySlug(slug);
    return post;
  });
}
