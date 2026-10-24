import { adminRoute } from '@/lib/server/guard';
import { json } from '@/lib/server/http';
import { listLeads } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return adminRoute(req, async () => json({ leads: await listLeads() }));
}
