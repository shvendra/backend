// waNotifier.js

/**
 * Sends a WhatsApp notification using the WA Notifier API.
 * 
 * @param {string} endpointUrl - Full WA Notifier API endpoint including the key.
 * @param {Object} payload - Payload to send, must include phone number and variables.
 * @returns {Object|null} - API response if successful, or null on error.
 */
export async function sendWaNotifierMessage(endpointUrl, payload) {
  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok) {
      // console.log("✅ Notification sent successfully:", result);
      return result;
    } else {
      console.error("❌ Notification failed:", result);
      return null;
    }
  } catch (error) {
    console.error("🚨 Error sending notification:", error);
    return null;
  }
}
