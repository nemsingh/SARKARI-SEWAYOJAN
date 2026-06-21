/**
 * Super-resilient Client-Side IndexedDB Data Vault for Sarkari Sewayojan
 * Allows storing full-size database backups directly in browser storage (up to hundreds of MBs)
 */

interface VaultBackup {
  id: string;
  timestamp: string;
  data: {
    categories: any[];
    category_links: any[];
    tablet_items: any[];
    posts: any[];
    settings_flat: Record<string, string>;
  };
}

const DB_NAME = 'SarkariSewayojanVaultDB';
const STORE_NAME = 'backups';
const DB_VERSION = 1;

export const initVaultDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error || new Error('Failed to open IndexedDB Vault'));
    };
  });
};

/**
 * Save a new database backup to the local browser vault
 */
export const saveBackupToVault = async (data: any, id: string = 'latest_daily'): Promise<boolean> => {
  try {
    const db = await initVaultDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const backupObj: VaultBackup = {
        id,
        timestamp: new Date().toISOString(),
        data: {
          categories: data.categories || [],
          category_links: data.category_links || [],
          tablet_items: data.tablet_items || [],
          posts: data.posts || [],
          settings_flat: data.settings_flat || {},
        }
      };

      const request = store.put(backupObj);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event: any) => {
        reject(event.target.error || new Error('Failed to save to vault'));
      };
    });
  } catch (error) {
    console.error('[Vault] Save error:', error);
    return false;
  }
};

/**
 * Retrieve a database backup from the local vault
 */
export const getBackupFromVault = async (id: string = 'latest_daily'): Promise<VaultBackup | null> => {
  try {
    const db = await initVaultDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = (event: any) => {
        resolve(event.target.result || null);
      };

      request.onerror = (event: any) => {
        reject(event.target.error || new Error('Failed to fetch from vault'));
      };
    });
  } catch (error) {
    console.error('[Vault] Read error:', error);
    return null;
  }
};

/**
 * Get all available system backups in the local vault
 */
export const getAllVaultBackups = async (): Promise<VaultBackup[]> => {
  try {
    const db = await initVaultDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = (event: any) => {
        resolve(event.target.result || []);
      };

      request.onerror = (event: any) => {
        reject(event.target.error || new Error('Failed to query vault backups'));
      };
    });
  } catch (error) {
    console.error('[Vault] Retrieve all error:', error);
    return [];
  }
};
