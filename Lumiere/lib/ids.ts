const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Short random id; uses Web Crypto, available in browsers, Node and the edge. */
export function randomId(len = 10): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Human-friendly project code, e.g. LC-7K2M-Q9XA. Contains no personal data. */
export function projectCode(): string {
  const r = randomId(8);
  return `LC-${r.slice(0, 4)}-${r.slice(4)}`;
}
