import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountVar) {
      let serviceAccount: any = serviceAccountVar;
      if (typeof serviceAccountVar === 'string') {
        try {
          serviceAccount = JSON.parse(serviceAccountVar);
        } catch {
          // If string is escaped or single-line
          serviceAccount = JSON.parse(serviceAccountVar.replace(/\n/g, '\\n'));
        }
      }

      // If private_key has escaped newlines, convert them to real newlines
      if (serviceAccount && serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp();
    }
  } catch (e) {
    console.error('Firebase Admin initialization error:', e);
  }
}

export default async function handler(req: any, res: any) {
  // Set CORS headers for Vercel Serverless Function
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  // Enforce Mandatory Firebase Admin Authentication
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
    if (!admin.apps.length) {
      return res.status(500).json({
        success: false,
        error: 'Firebase Admin not initialized. Please check FIREBASE_SERVICE_ACCOUNT_KEY in Vercel Environment Variables.',
      });
    }

    // Verify Firebase Auth ID Token strictly
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('🔒 Request authenticated successfully for UID:', decodedToken.uid);
  } catch (authErr: any) {
    console.error('❌ Authentication failed:', authErr.message);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired Firebase ID token.',
    });
  }

  const {
    jobTitle,
    title,
    body,
    category,
    applyUrl,
    postUrl,
    postId,
    topic,
  } = req.body || {};

  const notificationTitle = title || jobTitle;
  const notificationBody = body || '👉 Click Here to Check Details';
  const finalPostUrl = postUrl || applyUrl || '';
  const finalPostId = postId || '';
  const targetTopic = topic || 'all_users';

  if (!notificationTitle) {
    return res.status(400).json({ success: false, error: 'Title or jobTitle is required' });
  }

  // Direct topic targeting for "all_users" (or customized topic)
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

  try {
    if (!admin.apps.length) {
      return res.status(500).json({
        success: false,
        error: 'Firebase Admin not initialized. Please set FIREBASE_SERVICE_ACCOUNT_KEY in Vercel Environment Variables.',
      });
    }

    const response = await admin.messaging().send(message);
    console.log('✅ FCM Notification sent successfully to topic:', targetTopic, 'Message ID:', response);
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
  } catch (error: any) {
    console.error('❌ Error sending FCM notification:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send FCM notification',
    });
  }
}


