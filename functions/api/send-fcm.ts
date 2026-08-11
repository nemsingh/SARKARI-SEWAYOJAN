/**
 * Cloudflare Pages Function for sending FCM Notifications
 * Route: /api/send-fcm
 *
 * Environment Variable Required in Cloudflare Dashboard:
 * FIREBASE_SERVICE_ACCOUNT_KEY = JSON string of Service Account Key
 */

interface Env {
  FIREBASE_SERVICE_ACCOUNT_KEY: string;
}

// Helper to convert PEM string to CryptoKey for Web Crypto API in Cloudflare Workers/Pages
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = pem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s+/g, '');
  
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

// Generate Google OAuth2 Access Token for Firebase Messaging
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

  const base64UrlEncode = (str: string) =>
    btoa(str)
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const privateKeyPem = serviceAccount.private_key.replace(/\\n/g, '\n');
  const key = await importPrivateKey(privateKeyPem);

  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(unsignedToken)
  );

  const signatureArray = new Uint8Array(signatureBuffer);
  let signatureString = '';
  for (let i = 0; i < signatureArray.length; i++) {
    signatureString += String.fromCharCode(signatureArray[i]);
  }
  const encodedSignature = base64UrlEncode(signatureString);

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
    throw new Error(tokenData.error_description || 'Failed to obtain Google access token');
  }

  return tokenData.access_token;
}

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  try {
    // Mandate Firebase Authorization Bearer Token
    const authHeader = context.request.headers.get('Authorization') || context.request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Missing or invalid Authorization header. Firebase ID Token required.',
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    const rawServiceAccount = context.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!rawServiceAccount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing in Cloudflare Dashboard.',
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    let serviceAccount: any;
    try {
      serviceAccount = typeof rawServiceAccount === 'string' ? JSON.parse(rawServiceAccount) : rawServiceAccount;
    } catch {
      serviceAccount = JSON.parse((rawServiceAccount as string).replace(/\n/g, '\\n'));
    }

    const body: any = await context.request.json().catch(() => ({}));
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
      return new Response(
        JSON.stringify({ success: false, error: 'Title or jobTitle is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get OAuth2 Access Token for FCM HTTP v1 API
    const accessToken = await getGoogleAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;

    // Send via FCM HTTP v1 REST API using direct topic target
    const fcmPayload = {
      message: {
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
          priority: 'HIGH',
          notification: {
            sound: 'default',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
      },
    };

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
      console.error('Cloudflare FCM Error:', fcmData);
      return new Response(
        JSON.stringify({ success: false, error: fcmData.error?.message || 'Failed to send FCM via Cloudflare' }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ FCM Notification sent successfully via Cloudflare Pages:', fcmData.name);
    return new Response(
      JSON.stringify({
        success: true,
        messageId: fcmData.name,
        topic: targetTopic,
        provider: 'Cloudflare Pages Functions',
        data: {
          title: notificationTitle,
          postId: finalPostId,
          postUrl: finalPostUrl,
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('❌ Cloudflare Function Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
