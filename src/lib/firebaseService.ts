import { db } from './firebase';
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

// ============ CATEGORIES ============
export const getCategories = async () => {
  const q = query(collection(db, 'categories'));
  const snap = await getDocs(q);
  const cats = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  return cats.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
};

export const addCategory = async (name: string, displayOrder: number) => {
  return addDoc(collection(db, 'categories'), {
    name,
    display_order: displayOrder,
    created_at: serverTimestamp(),
  });
};

export const updateCategory = async (id: string, data: Record<string, any>) => {
  await updateDoc(doc(db, 'categories', id), data);
};

export const deleteCategory = async (id: string) => {
  await deleteDoc(doc(db, 'categories', id));
};

// ============ CATEGORY LINKS ============
export const getCategoryLinks = async () => {
  const q = query(collection(db, 'category_links'));
  const snap = await getDocs(q);
  const links = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  return links.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
};

export const addCategoryLink = async (data: {
  category_id: string;
  title: string;
  url: string;
  display_order: number;
  is_new: boolean;
  last_date_text: string | null;
}) => {
  return addDoc(collection(db, 'category_links'), {
    ...data,
    created_at: serverTimestamp(),
  });
};

export const updateCategoryLink = async (id: string, data: Record<string, any>) => {
  await updateDoc(doc(db, 'category_links', id), data);
};

export const deleteCategoryLink = async (id: string) => {
  await deleteDoc(doc(db, 'category_links', id));
};

export const deleteCategoryLinksByCategoryId = async (categoryId: string) => {
  const q = query(collection(db, 'category_links'), where('category_id', '==', categoryId));
  const snap = await getDocs(q);
  const deletes = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletes);
};

// ============ TABLET ITEMS ============
export const getTabletItems = async () => {
  const q = query(collection(db, 'tablet_items'));
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  return items.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
};

export const addTabletItem = async (title: string, subtitle: string, url: string, displayOrder: number) => {
  return addDoc(collection(db, 'tablet_items'), {
    title,
    subtitle,
    url,
    display_order: displayOrder,
    created_at: serverTimestamp(),
  });
};

export const updateTabletItem = async (id: string, data: Record<string, any>) => {
  await updateDoc(doc(db, 'tablet_items', id), data);
};

export const deleteTabletItem = async (id: string) => {
  await deleteDoc(doc(db, 'tablet_items', id));
};

// ============ POSTS ============
export const getPosts = async () => {
  const q = query(collection(db, 'posts'));
  const snap = await getDocs(q);
  const posts = snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      created_at: data.created_at?.toDate?.()?.toISOString?.() || data.created_at || '',
      updated_at: data.updated_at?.toDate?.()?.toISOString?.() || data.updated_at || '',
    };
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
    return { id: d.id, ...d.data() };
  }
  const docRef = doc(db, 'posts', slug);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const getPostById = async (id: string): Promise<Record<string, any> | null> => {
  const docRef = doc(db, 'posts', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const createPost = async (data: Record<string, any>) => {
  const docRef = await addDoc(collection(db, 'posts'), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return { id: docRef.id, ...data };
};

export const updatePost = async (id: string, data: Record<string, any>) => {
  await updateDoc(doc(db, 'posts', id), {
    ...data,
    updated_at: serverTimestamp(),
  });
};

export const deletePost = async (id: string) => {
  await deleteDoc(doc(db, 'posts', id));
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
