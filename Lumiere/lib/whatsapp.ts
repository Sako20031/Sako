/** Digits-only WhatsApp number (with country code) or null when not configured. */
export function whatsappNumber(raw: string): string | null {
  const d = (raw || '').replace(/\D/g, '');
  return d.length >= 10 && d.length <= 15 ? d : null;
}

export function whatsappLink(raw: string, text?: string): string | null {
  const n = whatsappNumber(raw);
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
