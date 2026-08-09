/**
 * FCM Notification Service
 * Sends notification signal to mobile apps via FCM topic 'data_updates'
 */

export interface FcmNotificationPayload {
  jobTitle: string;
  category?: string;
  applyUrl?: string;
}

export async function sendJobNotificationToApp(
  jobTitle: string,
  category?: string,
  applyUrl?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch('/api/send-fcm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobTitle,
        category: category || 'Latest Jobs',
        applyUrl: applyUrl || '',
      }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      console.log('✅ FCM App Notification sent successfully:', data.messageId);
      return { success: true, messageId: data.messageId };
    } else {
      console.error('❌ FCM Notification Error:', data.error);
      return { success: false, error: data.error || 'Failed to send notification' };
    }
  } catch (error: any) {
    console.error('❌ Network / Request Error sending FCM notification:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}
