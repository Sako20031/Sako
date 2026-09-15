import { NextResponse } from 'next/server';
import { getAssistantReply } from '../../../lib/assistant';
import { sendWhatsAppMessage } from '../../../lib/whatsapp';
import { getBusinessByPhoneNumberId } from '../../../lib/business';

// Meta calls this with a GET request once, to verify the webhook URL, using
// the WHATSAPP_VERIFY_TOKEN you chose when setting it up in the developer
// console. One verify token covers all client businesses — they all point
// their WhatsApp number's webhook at this same URL.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200 });
  }
  return new Response('forbidden', { status: 403 });
}

// Meta posts every incoming message (and delivery/status updates) here, for
// every client business's number. `value.metadata.phone_number_id` says
// which business number the message came in on — that's how one webhook
// serves many separate clients, each with their own menu/data.
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  if (!message || message.type !== 'text') {
    // Ignore status callbacks, reactions, media, etc. — always 200 so Meta
    // doesn't keep retrying.
    return NextResponse.json({ ok: true });
  }

  const phoneNumberId = value?.metadata?.phone_number_id;
  const business = phoneNumberId ? await getBusinessByPhoneNumberId(phoneNumberId) : null;
  if (!business) {
    console.error('whatsapp message for unconfigured business, phone_number_id:', phoneNumberId);
    return NextResponse.json({ ok: true });
  }

  const from = message.from;
  const text = message.text?.body || '';

  try {
    const reply = await getAssistantReply(business, from, text);
    await sendWhatsAppMessage(business.whatsapp_phone_number_id, business.whatsapp_token, from, reply);
  } catch (e) {
    console.error('whatsapp assistant error:', e);
  }

  return NextResponse.json({ ok: true });
}
