import { getCategories, getCategoryLinks, getTabletItems, getPosts, getSiteSettingsFlat, getPostBySlug } from './firebaseService';

export async function fetchStaticOrFirebase(url: string, fallbackFetch: () => Promise<any>) {
  try {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {
    console.warn(`Failed to fetch static JSON from ${url}, falling back to Firebase...`, e);
  }
  
  console.log(`Falling back to Firebase for ${url}`);
  return await fallbackFetch();
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
