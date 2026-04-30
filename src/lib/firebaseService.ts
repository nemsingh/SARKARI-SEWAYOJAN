import { db } from './firebase';
import LZString from 'lz-string';
import { clearCache } from './cache';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

const decompressHtml = (html: string | null | undefined) => {
  if (!html) return html;
  if (html.startsWith('LZ16:')) {
    return LZString.decompressFromUTF16(html.substring(5)) || html;
  }
  return html;
};

const compressHtml = (html: string | null | undefined) => {
  if (!html) return html;
  // Compress everything to be safe and consistent.
  return 'LZ16:' + LZString.compressToUTF16(html);
};

// ============ CATEGORIES ============
export const getCategories = async () => {
  const q = query(collection(db, 'categories'));
  const snap = await getDocs(q);
  const cats = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  return cats.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
};

export const addCategory = async (name: string, displayOrder: number) => {
  const res = await addDoc(collection(db, 'categories'), {
    name,
    display_order: displayOrder,
    created_at: serverTimestamp(),
  });
  clearCache();
  return res;
};

export const updateCategory = async (id: string, data: Record<string, any>) => {
  await updateDoc(doc(db, 'categories', id), data);
  clearCache();
};

export const deleteCategory = async (id: string) => {
  await deleteDoc(doc(db, 'categories', id));
  clearCache();
};

// ============ CATEGORY LINKS ============
export const getCategoryLinks = async () => {
  const q = query(collection(db, 'category_links'));
  const snap = await getDocs(q);
  const links = snap.docs.map(d => {
    const data = d.data() as any;
    let ts = data.link_timestamp;
    if (typeof ts === 'undefined') {
      ts = data.created_at?.toMillis ? data.created_at.toMillis() : 0;
    }
    // If the old item had display_order, subtract it so older items keep rough relative order (smaller display_order = higher priority natively, so we give them a slight boost)
    if (typeof ts === 'undefined') ts = 0;
    return { id: d.id, ...data, link_timestamp: ts };
  });
  // Sort descending by timestamp (newest or intentionally bumped to top)
  return links.sort((a, b) => b.link_timestamp - a.link_timestamp);
};

export const addCategoryLink = async (data: {
  category_id: string;
  title: string;
  url: string;
  link_timestamp?: number;
  is_new: boolean;
  last_date_text: string | null;
}) => {
  const ts = typeof data.link_timestamp !== 'undefined' ? data.link_timestamp : Date.now();
  const res = await addDoc(collection(db, 'category_links'), {
    ...data,
    link_timestamp: ts,
    created_at: serverTimestamp(),
  });
  clearCache();
  return res;
};

export const updateCategoryLink = async (id: string, data: Record<string, any>) => {
  await updateDoc(doc(db, 'category_links', id), data);
  clearCache();
};

export const deleteCategoryLink = async (id: string) => {
  await deleteDoc(doc(db, 'category_links', id));
  clearCache();
};

export const deleteCategoryLinksByCategoryId = async (categoryId: string) => {
  const q = query(collection(db, 'category_links'), where('category_id', '==', categoryId));
  const snap = await getDocs(q);
  const deletes = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletes);
  clearCache();
};

// ============ TABLET ITEMS ============
export const getTabletItems = async () => {
  const q = query(collection(db, 'tablet_items'));
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  return items.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
};

export const addTabletItem = async (title: string, subtitle: string, url: string, displayOrder: number) => {
  const res = await addDoc(collection(db, 'tablet_items'), {
    title,
    subtitle,
    url,
    display_order: displayOrder,
    created_at: serverTimestamp(),
  });
  clearCache();
  return res;
};

export const updateTabletItem = async (id: string, data: Record<string, any>) => {
  await updateDoc(doc(db, 'tablet_items', id), data);
  clearCache();
};

export const deleteTabletItem = async (id: string) => {
  await deleteDoc(doc(db, 'tablet_items', id));
  clearCache();
};

// ============ POSTS ============
export const getPosts = async () => {
  const q = query(collection(db, 'posts'));
  const snap = await getDocs(q);
  const posts = snap.docs.map(d => {
    const data = d.data() as Record<string, any>;
    return {
      id: d.id,
      ...data,
      tables_html: decompressHtml(data.tables_html),
      tables_html_hi: decompressHtml(data.tables_html_hi),
      created_at: data.created_at?.toDate?.()?.toISOString?.() || data.created_at || '',
      updated_at: data.updated_at?.toDate?.()?.toISOString?.() || data.updated_at || '',
    } as Record<string, any>;
  });
  return posts.sort((a, b) => {
    const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
    const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
    return dateB - dateA;
  });
};

export const getPostBySlug = async (slug: string): Promise<Record<string, any> | null> => {
  const q = query(collection(db, 'posts'), where('slug', '==', slug));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    const data = d.data();
    return { 
      id: d.id, 
      ...data,
      tables_html: decompressHtml(data.tables_html),
      tables_html_hi: decompressHtml(data.tables_html_hi),
    };
  }
  const docRef = doc(db, 'posts', slug);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return { 
      id: docSnap.id, 
      ...data,
      tables_html: decompressHtml(data.tables_html),
      tables_html_hi: decompressHtml(data.tables_html_hi),
    };
  }
  return null;
};

export const getPostById = async (id: string): Promise<Record<string, any> | null> => {
  const docRef = doc(db, 'posts', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return { 
      id: docSnap.id, 
      ...data,
      tables_html: decompressHtml(data.tables_html),
      tables_html_hi: decompressHtml(data.tables_html_hi),
    };
  }
  return null;
};

export const createPost = async (data: Record<string, any>) => {
  const postData = { ...data };
  if (postData.tables_html) postData.tables_html = compressHtml(postData.tables_html);
  if (postData.tables_html_hi) postData.tables_html_hi = compressHtml(postData.tables_html_hi);

  // Check size after compression to prevent Firebase 1MB limit error (approx 500,000 UTF-16 chars)
  const totalCompressedChars = (postData.tables_html?.length || 0) + (postData.tables_html_hi?.length || 0);
  if (totalCompressedChars > 480000) {
    throw new Error('Post content is too large even after compression. Please reduce the number of tables or text.');
  }

  const docRef = await addDoc(collection(db, 'posts'), {
    ...postData,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  clearCache();
  return { id: docRef.id, ...data };
};

export const updatePost = async (id: string, data: Record<string, any>) => {
  const postData = { ...data };
  if (postData.tables_html !== undefined) postData.tables_html = compressHtml(postData.tables_html);
  if (postData.tables_html_hi !== undefined) postData.tables_html_hi = compressHtml(postData.tables_html_hi);

  // Check size after compression to prevent Firebase 1MB limit error (approx 500,000 UTF-16 chars)
  const totalCompressedChars = (postData.tables_html?.length || 0) + (postData.tables_html_hi?.length || 0);
  if (totalCompressedChars > 480000) {
    throw new Error('Post content is too large even after compression. Please reduce the number of tables or text.');
  }

  await updateDoc(doc(db, 'posts', id), {
    ...postData,
    updated_at: serverTimestamp(),
  });
  clearCache();
};

export const deletePost = async (id: string) => {
  await deleteDoc(doc(db, 'posts', id));
  clearCache();
};

// ============ SITE SETTINGS ============
export const getSiteSettings = async () => {
  const snap = await getDocs(collection(db, 'site_settings'));
  const settings: Record<string, any> = {};
  snap.docs.forEach(d => {
    const data = d.data();
    settings[data.key] = { id: d.id, key: data.key, value: data.value };
  });
  return settings;
};

export const getSiteSettingsFlat = async () => {
  const snap = await getDocs(collection(db, 'site_settings'));
  const settings: Record<string, string> = {};
  snap.docs.forEach(d => {
    const data = d.data();
    settings[data.key] = data.value;
  });
  return settings;
};

export const updateSiteSetting = async (key: string, value: string, existingId?: string) => {
  if (existingId) {
    await updateDoc(doc(db, 'site_settings', existingId), { value, updated_at: serverTimestamp() });
  } else {
    await addDoc(collection(db, 'site_settings'), { key, value, updated_at: serverTimestamp() });
  }
  clearCache();
};

export const getSiteLastUpdated = async (): Promise<number> => {
  const docRef = doc(db, 'site_settings', 'last_updated');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().timestamp || 0;
  }
  return 0;
};

export const updateSiteLastUpdated = async () => {
  const docRef = doc(db, 'site_settings', 'last_updated');
  await setDoc(docRef, { timestamp: Date.now() }, { merge: true });
};

// Removed realtime listeners
