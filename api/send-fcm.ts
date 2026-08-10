import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountVar) {
      const serviceAccount = typeof serviceAccountVar === 'string' && serviceAccountVar.startsWith('{')
        ? JSON.parse(serviceAccountVar)
        : serviceAccountVar;

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp();
    }
  } catch (e) {
    console.error('Firebase admin init error:', e);
  }
}

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { jobTitle, category, applyUrl } = req.body || {};

  if (!jobTitle) {
    return res.status(400).json({ error: 'jobTitle is required' });
  }

  const message = {
    condition: "'data_updates' in topics || 'all_users' in topics",
    notification: {
      title: jobTitle,
      body: '👉 Click Here',
    },
    data: {
      title: jobTitle,
      jobTitle: jobTitle,
      category: category || 'Latest Jobs',
      apply_url: applyUrl || '',
      applyUrl: applyUrl || '',
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
        error: 'Firebase Admin not initialized. Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable in Vercel/Hosting environment.',
      });
    }

    const response = await admin.messaging().send(message);
    console.log('✅ App Notification sent successfully:', response);
    return res.status(200).json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('❌ Error sending notification:', error);
    return res.status(500).json({ error: error.message || 'Failed to send notification' });
  }
}
