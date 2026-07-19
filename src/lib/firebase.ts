// Firebase configuration and initialization
// These are publishable client-side keys (safe to include in frontend code)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  doc, 
  getDocFromServer,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  disableNetwork,
  enableNetwork
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC_Tl9QGjU2jXd_1F_dWxF7XoxhP_9ttyU",
  authDomain: "sarkari-sewayojan.firebaseapp.com",
  projectId: "sarkari-sewayojan",
  storageBucket: "sarkari-sewayojan.firebasestorage.app",
  messagingSenderId: "949119675074",
  appId: "1:949119675074:web:a58f79a40a22e0f768a95b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

// Safe double-initialization guard utilizing globalThis
const globalWithFirebase = globalThis as typeof globalThis & {
  _firebaseDb?: any;
};

// Set log level as early as possible to silence non-critical connection warnings
setLogLevel('error');

let firestoreInstance;
if (globalWithFirebase._firebaseDb) {
  firestoreInstance = globalWithFirebase._firebaseDb;
} else {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ...(isBrowser ? {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    } : {})
  });
  globalWithFirebase._firebaseDb = firestoreInstance;

  // Optimize production client performance by operating in offline-only mode by default
  // This completely eliminates any Firebase network timeouts/warnings for visitors and headless bots (Microlink)
  if (isBrowser && !import.meta.env.DEV) {
    const isAdminPage = window.location.pathname.startsWith('/admin');
    if (!isAdminPage) {
      console.log("[Firestore] Operating in offline-only mode for client performance.");
      disableNetwork(firestoreInstance).catch(err => {
        console.warn("[Firestore] Failed to disable network:", err);
      });
    }
  }
}

// Initialize Firestore with extreme resilience settings (Long Polling + Offline Local Caching)
export const db = firestoreInstance;

export async function ensureFirestoreNetwork() {
  if (isBrowser) {
    try {
      await enableNetwork(db);
      console.log("[Firestore] Network connection enabled successfully for Admin panel.");
    } catch (err) {
      console.warn("[Firestore] Failed to enable network:", err);
    }
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  const errorJson = JSON.stringify(errInfo);
  console.error('Firestore Error Details:', errorJson);
  throw new Error(errorJson);
}

export default app;


