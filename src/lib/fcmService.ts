/**
 * FCM Notification Service
 * Queues notification signals when posts are created/edited and sends them when "Publish Website" is clicked.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface FcmNotificationPayload {
  jobTitle: string;
  category?: string;
  applyUrl?: string;
  postId?: string;
}

const LOCAL_STORAGE_KEY = 'pending_fcm_notifications_queue';

export async function sendJobNotificationToApp(
  jobTitle: string,
  category?: string,
  applyUrl?: string,
  postId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Extract postId from applyUrl if not directly passed (e.g. /post/my-post-id)
    let computedPostId = postId || '';
    if (!computedPostId && applyUrl) {
      const match = applyUrl.match(/\/post\/([^/]+)/);
      if (match && match[1]) {
        computedPostId = match[1];
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Attach Firebase Auth Token if admin user is logged in
    if (auth.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      } catch (tokenErr) {
        console.warn('Could not retrieve Auth ID token:', tokenErr);
      }
    }

    const response = await fetch('/api/send-fcm', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jobTitle,
        category: category || 'Latest Jobs',
        applyUrl: applyUrl || '',
        postUrl: applyUrl || '',
        postId: computedPostId,
        topic: 'all_users',
      }),
    });

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = {
        success: false,
        error: responseText.trim() || `Server error (${response.status})`,
      };
    }
    console.log('FCM API response:', response.status, data);

    if (response.ok && data.success) {
      console.log('✅ FCM Notification sent successfully:', {
        httpStatus: response.status,
        success: data.success,
        messageId: data.messageId,
        topic: data.topic || 'all_users',
      });
      return { success: true, messageId: data.messageId };
    } else {
      console.error('❌ FCM Notification Failed:', {
        httpStatus: response.status,
        success: data.success || false,
        topic: data.topic || 'all_users',
        error: data.error || 'Failed to send notification',
      });
      return { success: false, error: data.error || 'Failed to send notification' };
    }
  } catch (error: any) {
    console.error('❌ Network / Request Error sending FCM notification:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Queues a notification to be sent when "Publish Website" is clicked.
 */
export async function queueFcmNotification(
  jobTitle: string,
  category?: string,
  applyUrl?: string,
  postId?: string
) {
  let computedPostId = postId || '';
  if (!computedPostId && applyUrl) {
    const match = applyUrl.match(/\/post\/([^/]+)/);
    if (match && match[1]) {
      computedPostId = match[1];
    }
  }

  const newItem: FcmNotificationPayload = {
    jobTitle,
    category: category || 'Latest Jobs',
    applyUrl: applyUrl || '',
    postId: computedPostId,
  };

  // 1. Update LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const list: FcmNotificationPayload[] = raw ? JSON.parse(raw) : [];
    const exists = list.some(
      i => i.jobTitle === newItem.jobTitle && i.category === newItem.category && i.applyUrl === newItem.applyUrl
    );
    if (!exists) {
      list.push(newItem);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.error('Failed to update localStorage FCM queue:', e);
  }

  // 2. Update Firestore for multi-device support
  try {
    const queueRef = doc(db, 'site_settings', 'pending_fcm_queue');
    const docSnap = await getDoc(queueRef);
    let items: FcmNotificationPayload[] = [];
    if (docSnap.exists()) {
      items = docSnap.data().items || [];
    }
    const existsInDb = items.some(
      i => i.jobTitle === newItem.jobTitle && i.category === newItem.category && i.applyUrl === newItem.applyUrl
    );
    if (!existsInDb) {
      items.push(newItem);
      await setDoc(queueRef, { items, updated_at: new Date().toISOString() });
    }
  } catch (e) {
    console.error('Failed to update Firestore FCM queue:', e);
  }
}

/**
 * Sends all pending FCM notifications when "Publish Website" button is clicked.
 */
export async function sendPendingFcmNotifications(): Promise<{ sentCount: number }> {
  let pendingList: FcmNotificationPayload[] = [];

  // Read from LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      pendingList = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed reading localStorage FCM queue:', e);
  }

  // Sync from Firestore queue
  try {
    const queueRef = doc(db, 'site_settings', 'pending_fcm_queue');
    const docSnap = await getDoc(queueRef);
    if (docSnap.exists()) {
      const dbItems: FcmNotificationPayload[] = docSnap.data().items || [];
      for (const item of dbItems) {
        if (!pendingList.some(i => i.jobTitle === item.jobTitle && i.category === item.category && i.applyUrl === item.applyUrl)) {
          pendingList.push(item);
        }
      }
    }
  } catch (e) {
    console.error('Failed reading Firestore FCM queue:', e);
  }

  if (pendingList.length === 0) {
    console.log('No pending FCM notifications in queue.');
    return { sentCount: 0 };
  }

  console.log(`🚀 Publishing Website: Sending ${pendingList.length} pending FCM notifications...`);

  let sentCount = 0;
  for (const item of pendingList) {
    const res = await sendJobNotificationToApp(item.jobTitle, item.category, item.applyUrl, item.postId);
    if (res.success) {
      sentCount++;
    }
  }

  // Clear queues after sending
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear localStorage queue:', e);
  }

  try {
    const queueRef = doc(db, 'site_settings', 'pending_fcm_queue');
    await setDoc(queueRef, { items: [], updated_at: new Date().toISOString() });
  } catch (e) {
    console.error('Failed to clear Firestore queue:', e);
  }

  return { sentCount };
}
