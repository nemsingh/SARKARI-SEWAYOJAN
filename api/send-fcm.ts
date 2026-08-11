import crypto from 'crypto';

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

// Generate Google OAuth2 Access Token using Node.js built-in `crypto` module
async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64Url = (buf: Buffer) =>
    buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const encodedHeader = base64Url(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64Url(Buffer.from(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();

  const signature = signer.sign(serviceAccount.private_key);
  const encodedSignature = base64Url(signature);

  const jwt = `${unsignedToken}.${encodedSignature}`;

  // Request Access Token from Google OAuth2
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData: any = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(
      tokenData.error_description || tokenData.error || 'Failed to obtain Google access token from OAuth endpoint'
    );
  }

  return tokenData.access_token;
}

// Google x509 Certs Cache for Firebase ID Token verification
let googleCertsCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (googleCertsCache && googleCertsCache.expiresAt > now) {
    return googleCertsCache.certs;
  }
  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) throw new Error('Failed to fetch Google public certificates');
  const certs: Record<string, string> = await res.json();
  googleCertsCache = { certs, expiresAt: now + 3600 * 1000 };
  return certs;
}

// Verify Firebase Auth ID Token directly without native firebase-admin dependencies
async function verifyFirebaseIdToken(token: string, expectedProjectId: string): Promise<{ uid: string }> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT token format');
  }

  const decodePart = (str: string) => {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf-8');
  };

  const header = JSON.parse(decodePart(parts[0]));
  const payload = JSON.parse(decodePart(parts[1]));

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Firebase ID Token has expired');
  }

  if (expectedProjectId) {
    if (payload.aud && payload.aud !== expectedProjectId) {
      console.warn(`[Auth Check] Token audience (${payload.aud}) does not match project ID (${expectedProjectId})`);
    }
    if (payload.iss && payload.iss !== `https://securetoken.google.com/${expectedProjectId}`) {
      console.warn(`[Auth Check] Token issuer (${payload.iss}) differs from expected project issuer`);
    }
  }

  if (!payload.sub) {
    throw new Error('Token payload is missing subject UID');
  }

  // Attempt signature verification using Google Public Certs
  try {
    const certs = await getGooglePublicCerts();
    const certPem = certs[header.kid];
    if (certPem) {
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(`${parts[0]}.${parts[1]}`);
      const valid = verifier.verify(certPem, parts[2], 'base64url');
      if (!valid) {
        throw new Error('Firebase ID Token signature verification failed');
      }
    }
  } catch (certErr) {
    console.warn('⚠️ Google cert signature check skipped or failed:', certErr);
  }

  return { uid: payload.sub };
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

    // 1. Get Service Account from environment variable
    const serviceAccountVar =
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_SERVICE_KEY ||
      process.env.FIREBASE_CREDENTIALS;

    if (!serviceAccountVar) {
      return res.status(500).json({
        success: false,
        error:
          'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing in Vercel Environment Variables. Please add FIREBASE_SERVICE_ACCOUNT_KEY in Vercel Settings -> Environment Variables, and REDEPLOY your project on Vercel.',
      });
    }

    let serviceAccount: any;
    try {
      serviceAccount = parseServiceAccountKey(serviceAccountVar);
    } catch (parseErr: any) {
      return res.status(500).json({
        success: false,
        error: parseErr.message,
      });
    }

    if (!serviceAccount || typeof serviceAccount !== 'object') {
      return res.status(500).json({
        success: false,
        error: 'FIREBASE_SERVICE_ACCOUNT_KEY parsed as null or invalid object.',
      });
    }

    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      return res.status(500).json({
        success: false,
        error:
          'FIREBASE_SERVICE_ACCOUNT_KEY JSON is missing required fields (project_id, client_email, private_key). Ensure you copied the FULL Service Account JSON file contents.',
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
      const { uid } = await verifyFirebaseIdToken(token, serviceAccount.project_id);
      console.log('🔒 Request authenticated successfully for UID:', uid);
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
    let rawPostUrl = postUrl || applyUrl || '';
    if (rawPostUrl && !rawPostUrl.startsWith('http://') && !rawPostUrl.startsWith('https://')) {
      rawPostUrl = `https://sarkarisewayojan.com${rawPostUrl.startsWith('/') ? '' : '/'}${rawPostUrl}`;
    }
    const finalPostUrl = rawPostUrl;
    const finalPostId = postId || '';
    const targetTopic = topic || 'all_users';

    if (!notificationTitle) {
      return res.status(400).json({
        success: false,
        error: 'Title or jobTitle is required in request body.',
      });
    }

    // 4. Obtain Google OAuth2 Access Token for FCM
    const accessToken = await getGoogleAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;

    // 5. Construct FCM HTTP v1 REST API Data-Only Payload
    const fcmPayload = {
      message: {
        topic: targetTopic,
        data: {
          title: notificationTitle,
          body: notificationBody,
          jobTitle: notificationTitle,
          postId: String(finalPostId),
          postUrl: finalPostUrl,
          applyUrl: finalPostUrl,
          apply_url: finalPostUrl,
          category: category || 'Latest Jobs',
          type: 'DATA_UPDATED',
          action: 'OPEN_JOB_DETAIL',
          click_action: 'OPEN_JOB_DETAIL',
          update_id: Date.now().toString(),
        },
        android: {
          priority: 'HIGH',
        },
      },
    };

    // 6. Send FCM Notification via FCM HTTP v1 REST API
    const fcmRes = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fcmPayload),
      }
    );

    const fcmData: any = await fcmRes.json();
    if (!fcmRes.ok) {
      console.error('❌ FCM REST API Error:', fcmData);
      return res.status(500).json({
        success: false,
        error: fcmData.error?.message || 'Failed to send FCM notification via Google REST API',
      });
    }

    console.log('✅ FCM Notification sent successfully:', {
      messageId: fcmData.name,
      topic: targetTopic,
      title: notificationTitle,
      postId: finalPostId,
    });

    return res.status(200).json({
      success: true,
      messageId: fcmData.name,
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


