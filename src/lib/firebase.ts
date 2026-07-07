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

let firestoreInstance;
if (globalWithFirebase._firebaseDb) {
  firestoreInstance = globalWithFirebase._firebaseDb;
} else {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false,
    ...(isBrowser ? {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    } : {})
  });
  globalWithFirebase._firebaseDb = firestoreInstance;
}

// Silence non-critical Firestore logs/warnings in application console
setLogLevel('error');

// Initialize Firestore with extreme resilience settings (Long Polling + Offline Local Caching)
export const db = firestoreInstance;

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

// Validate Connection to Firestore on boot with a 2-second timeout
async function testConnection() {
  if (!isBrowser) return;
  
  // Race the connection check against a 2-second timeout
  const connectionPromise = getDocFromServer(doc(db, 'test', 'connection'));
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Connection timeout')), 2000)
  );

  try {
    await Promise.race([connectionPromise, timeoutPromise]);
    console.log('[Firebase] Connection to Firestore backend succeeded!');
    await enableNetwork(db); // Ensure network is enabled
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    } else {
      console.warn('[Firebase] Backend unreachable or timeout. Operating in offline local cache mode.');
    }
    try {
      await disableNetwork(db);
    } catch (e) {
      // Ignore errors trying to disable network
    }
  }
}

// Start connection check after a tiny delay to allow app boot
if (isBrowser) {
  setTimeout(() => {
    testConnection().catch(err => {
      console.warn('[Firebase] testConnection failed silently:', err);
    });
  }, 100);
}

export default app;


