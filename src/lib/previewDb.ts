export const savePreviewData = (data: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('preview_db', 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('previews')) {
        db.createObjectStore('previews', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction('previews', 'readwrite');
      const store = tx.objectStore('previews');
      store.put({ id: 'current_preview', data });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getPreviewData = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('preview_db', 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('previews')) {
        db.createObjectStore('previews', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('previews')) {
        resolve(null);
        return;
      }
      const tx = db.transaction('previews', 'readonly');
      const store = tx.objectStore('previews');
      const req = store.get('current_preview');
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => reject(req.error);
    };
    request.onerror = () => reject(request.error);
  });
};
