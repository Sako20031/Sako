export interface ContactErrors {
  name?: 'name';
  phone?: 'phone';
}

/** Phone with country code: starts with + or 00 and has 8–15 digits (E.164 range). */
export function isValidPhone(raw: string): boolean {
  const v = raw.trim();
  if (!/^(\+|00)[\d\s().-]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, '').replace(/^00/, '');
  return digits.length >= 8 && digits.length <= 15;
}

export function validateContact(name: string, phone: string): ContactErrors {
  const errors: ContactErrors = {};
  if (name.trim().replace(/[^\p{L}]/gu, '').length < 2) errors.name = 'name';
  if (!isValidPhone(phone)) errors.phone = 'phone';
  return errors;
}
