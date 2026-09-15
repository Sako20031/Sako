const API_VERSION = 'v21.0';

// Sends a plain-text WhatsApp message via the Meta Cloud API. Requires
// WHATSAPP_TOKEN (a permanent or long-lived access token for the WhatsApp
// Business app) and WHATSAPP_PHONE_NUMBER_ID (the sending number's ID from
// the Meta developer console) to be set as environment variables.
export async function sendWhatsAppMessage(to, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error('WhatsApp is not configured (missing WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID)');

  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text, preview_url: false },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WhatsApp send failed: ${res.status} ${errText}`);
  }
  return res.json();
}
