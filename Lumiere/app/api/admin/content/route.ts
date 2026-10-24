import { defaultContent } from '@/config';
import { getContentFresh } from '@/lib/server/content';
import { adminRoute } from '@/lib/server/guard';
import { json } from '@/lib/server/http';
import { kvGetMany } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return adminRoute(req, async () => {
    const overrides = await kvGetMany('content:');
    return json({
      content: await getContentFresh(),
      defaults: defaultContent,
      customized: Object.keys(overrides).map((k) => k.slice('content:'.length)),
    });
  });
}
