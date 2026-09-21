const API_VERSION = 'v21.0';

// Sends a plain-text WhatsApp message via the Meta Cloud API, using the
// sending business's own token/number (each client business has its own —
// see the `businesses` table).
export async function sendWhatsAppMessage(phoneId, token, to, text) {
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
