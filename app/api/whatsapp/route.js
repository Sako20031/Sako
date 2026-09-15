import { NextResponse } from 'next/server';
import { getAssistantReply } from '../../../lib/assistant';
import { sendWhatsAppMessage } from '../../../lib/whatsapp';

// Meta calls this with a GET request once, to verify the webhook URL, using
// the WHATSAPP_VERIFY_TOKEN you chose when setting it up in the developer
// console.
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

// Meta posts every incoming message (and delivery/status updates) here.
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message || message.type !== 'text') {
    // Ignore status callbacks, reactions, media, etc. — always 200 so Meta
    // doesn't keep retrying.
    return NextResponse.json({ ok: true });
  }

  const from = message.from;
  const text = message.text?.body || '';

  try {
    const reply = await getAssistantReply(from, text);
    await sendWhatsAppMessage(from, reply);
  } catch (e) {
    console.error('whatsapp assistant error:', e);
  }

  return NextResponse.json({ ok: true });
}
