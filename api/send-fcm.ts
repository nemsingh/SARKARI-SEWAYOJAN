import admin from 'firebase-admin';

// Helper function to safely parse Service Account JSON from environment variables
function parseServiceAccountKey(rawKey: string): any {
  if (!rawKey) return null;

  const trimmed = rawKey.trim();

  // Handle Base64 encoded JSON string
  if (trimmed.startsWith('eyJ') || !trimmed.startsWith('{')) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
      if (decoded.startsWith('{')) {
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.private_key) {
          parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
        }
        return parsed;
      }
    } catch {
      // Not base64, continue to normal string parsing
    }
  }

  // Handle standard JSON string
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  } catch {
    // If double escaped or contains literal newlines
    try {
      const sanitized = trimmed.replace(/\n/g, '\\n');
      const parsed = JSON.parse(sanitized);
      if (parsed && parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      return parsed;
    } catch {
      throw new Error(
        'Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is a valid JSON string or Base64 encoded string in Vercel Environment Variables.'
      );
    }
  }
}

// Lazy initialization of Firebase Admin SDK
function initFirebaseAdmin(): { initialized: boolean; error?: string } {
  if (admin.apps.length > 0) {
    return { initialized: true };
  }

  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountVar) {
    return {
      initialized: false,
      error:
        'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing in Vercel Environment Variables.',
    };
  }

  try {
    const serviceAccount = parseServiceAccountKey(serviceAccountVar);
    if (!serviceAccount || !serviceAccount.project_id || !serviceAccount.private_key) {
      return {
        initialized: false,
        error:
          'FIREBASE_SERVICE_ACCOUNT_KEY JSON is invalid or missing required fields (project_id, client_email, private_key).',
      };
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    return { initialized: true };
  } catch (err: any) {
    console.error('❌ Firebase Admin Initialization Error:', err.message);
    return {
      initialized: false,
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
    const initResult = initFirebaseAdmin();
    if (!initResult.initialized) {
      console.error('❌ FCM API Initialization Error:', initResult.error);
      return res.status(500).json({
        success: false,
        error: initResult.error,
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
      const decodedToken = await admin.auth().verifyIdToken(token);
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
    const message: admin.messaging.Message = {
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
        priority: 'high',
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
    const response = await admin.messaging().send(message);
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
      data: {
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



