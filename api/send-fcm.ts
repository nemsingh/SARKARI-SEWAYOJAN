import admin from 'firebase-admin';

// Helper function to safely get the Admin instance across ESM and CJS bundlers
function getAdminInstance(): any {
  if (admin && typeof admin.initializeApp === 'function') {
    return admin;
  }
  if ((admin as any)?.default && typeof (admin as any).default.initializeApp === 'function') {
    return (admin as any).default;
  }
  return admin;
}

// Helper function to safely parse Service Account JSON from environment variables
function parseServiceAccountKey(rawKey: string): any {
  if (!rawKey) return null;

  let trimmed = rawKey.trim();

  // Strip wrapping outer quotes if present
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.substring(1, trimmed.length - 1).trim();
  }

  // Handle Base64 encoded JSON string
  if (trimmed.startsWith('eyJ') || (!trimmed.startsWith('{') && !trimmed.startsWith('{\n'))) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
      if (decoded.startsWith('{')) {
        trimmed = decoded;
      }
    } catch {
      // Not base64, continue to normal string parsing
    }
  }

  // Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Retry with escaped newlines replaced
    try {
      const sanitized = trimmed.replace(/\r?\n/g, '\\n');
      parsed = JSON.parse(sanitized);
    } catch {
      throw new Error(
        'Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Please ensure you copied the entire raw JSON contents from your Firebase Service Account key file into Vercel Environment Variables.'
      );
    }
  }

  // Fix private_key escaped newlines (\n -> real newlines)
  if (parsed && typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }

  return parsed;
}

// Lazy initialization of Firebase Admin SDK
function initFirebaseAdmin(): { admin: any; error?: string } {
  try {
    const firebaseAdmin = getAdminInstance();
    if (!firebaseAdmin) {
      return { admin: null, error: 'Firebase Admin SDK could not be loaded.' };
    }

    const existingApps = firebaseAdmin.apps || [];
    if (Array.isArray(existingApps) && existingApps.length > 0) {
      return { admin: firebaseAdmin };
    }

    const serviceAccountVar =
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_SERVICE_KEY ||
      process.env.FIREBASE_CREDENTIALS;

    if (!serviceAccountVar) {
      return {
        admin: null,
        error:
          'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing in Vercel Environment Variables. Please add FIREBASE_SERVICE_ACCOUNT_KEY in Vercel Settings -> Environment Variables, and REDEPLOY your project on Vercel.',
      };
    }

    const serviceAccount = parseServiceAccountKey(serviceAccountVar);
    if (!serviceAccount || typeof serviceAccount !== 'object') {
      return {
        admin: null,
        error: 'FIREBASE_SERVICE_ACCOUNT_KEY parsed as null or invalid object.',
      };
    }

    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      return {
        admin: null,
        error:
          'FIREBASE_SERVICE_ACCOUNT_KEY JSON is missing required fields (project_id, client_email, private_key). Ensure you copied the FULL Service Account JSON file contents.',
      };
    }

    if (!firebaseAdmin.credential || typeof firebaseAdmin.credential.cert !== 'function') {
      return {
        admin: null,
        error: 'Firebase Admin credential helper is unavailable in the current runtime environment.',
      };
    }

    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(serviceAccount),
    });

    return { admin: firebaseAdmin };
  } catch (err: any) {
    console.error('❌ Firebase Admin Initialization Error:', err.message);
    return {
      admin: null,
      error: `Firebase Admin initialization failed: ${err.message}`,
    };
  }
}

export default async function handler(req: any, res: any) {
  // Always set JSON Content-Type and CORS headers first
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
    }

    // Safely parse body if sent as raw string
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    // 1. Initialize Firebase Admin SDK
    const { admin: firebaseAdmin, error: initError } = initFirebaseAdmin();
    if (!firebaseAdmin || initError) {
      console.error('❌ FCM API Initialization Error:', initError);
      return res.status(500).json({
        success: false,
        error: initError || 'Firebase Admin SDK initialization failed',
      });
    }

    // 2. Enforce Mandatory Firebase Admin Authentication
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or invalid Authorization header. Firebase ID Token required.',
      });
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Bearer token is empty.',
      });
    }

    try {
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      console.log('🔒 Request authenticated successfully for UID:', decodedToken.uid);
    } catch (authErr: any) {
      console.error('❌ Authentication failed:', authErr.message);
      return res.status(401).json({
        success: false,
        error: `Unauthorized: Invalid or expired Firebase ID token (${authErr.message})`,
      });
    }

    // 3. Extract Payload Data
    const {
      jobTitle,
      title,
      body: msgBody,
      category,
      applyUrl,
      postUrl,
      postId,
      topic,
    } = body;

    const notificationTitle = title || jobTitle;
    const notificationBody = msgBody || '👉 Click Here to Check Details';
    const finalPostUrl = postUrl || applyUrl || '';
    const finalPostId = postId || '';
    const targetTopic = topic || 'all_users';

    if (!notificationTitle) {
      return res.status(400).json({
        success: false,
        error: 'Title or jobTitle is required in request body.',
      });
    }

    // 4. Construct FCM Message targeting "all_users"
    const message = {
      topic: targetTopic,
      notification: {
        title: notificationTitle,
        body: notificationBody,
      },
      data: {
        title: notificationTitle,
        jobTitle: notificationTitle,
        body: notificationBody,
        postId: String(finalPostId),
        postUrl: finalPostUrl,
        apply_url: finalPostUrl,
        applyUrl: finalPostUrl,
        category: category || 'Latest Jobs',
        type: 'DATA_UPDATED',
        action: 'REFRESH_DATA',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        update_id: Date.now().toString(),
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: 'default',
          },
        },
      },
    };

    // 5. Send FCM Notification via Firebase Admin SDK
    const response = await firebaseAdmin.messaging().send(message);
    console.log('✅ FCM Notification sent successfully:', {
      messageId: response,
      topic: targetTopic,
      title: notificationTitle,
      postId: finalPostId,
    });

    return res.status(200).json({
      success: true,
      messageId: response,
      topic: targetTopic,
      payload: {
        title: notificationTitle,
        postId: finalPostId,
        postUrl: finalPostUrl,
      },
    });
  } catch (globalError: any) {
    console.error('❌ Server error in /api/send-fcm:', globalError?.message || globalError);
    return res.status(500).json({
      success: false,
      error: globalError?.message || 'Internal Server Error while sending notification',
    });
  }
}

