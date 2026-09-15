// Guards the /api/platform/* management endpoints (used to onboard new
// client businesses) with a shared secret, since these routes are meant for
// you (the reseller) or your own admin tooling, not the public.
export function isPlatformAdmin(req) {
  const secret = process.env.PLATFORM_ADMIN_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token === secret;
}
