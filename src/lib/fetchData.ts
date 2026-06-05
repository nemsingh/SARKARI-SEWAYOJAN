import * as firebaseService from './firebaseService';

export async function fetchStaticOrFirebase(url: string, fallbackFetch: () => Promise<any>) {
  // In development, directly hit Firebase to ensure live preview works after Admin edits.
  if (import.meta.env.DEV) {
    console.log(`[DEV MODE] Fetching live data from Firebase for ${url}`);
    try {
      return await fallbackFetch();
    } catch (e) {
      console.warn(`[DEV MODE] Live Firebase fetch failed for ${url}. Attempting to fall back to pre-generated static JSON.`, e);
      try {
        const res = await fetch(url);
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            console.log(`[DEV MODE] Successfully loaded static fallback data for ${url}`);
            return data;
          }
        }
      } catch (staticErr) {
        console.error(`[DEV MODE] Static JSON fallback also failed for ${url}:`, staticErr);
      }
      
      // If static JSON is also unavailable, return a safe minimal empty structure instead of crashing the layout
      if (url.includes('data.json')) {
        return { categories: [], category_links: [], tablet_items: [], posts: [], settings_flat: {} };
      }
      return null;
    }
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
