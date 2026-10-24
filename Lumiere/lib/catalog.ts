import type { CatalogEntry, SiteContent } from '../types/index.ts';
import { startingPricePerM2 } from './pricing.ts';
import { formatMoney } from './format.ts';

/** Enabled catalog items with a resolved "from" price label. */
export function catalogEntries(content: SiteContent): CatalogEntry[] {
  return content.catalog
    .filter((i) => i.enabled)
    .map((i) => {
      const n = content.pricing.mode === 'off' ? null : (i.startingPrice ?? startingPricePerM2(content.pricing, i.materialId));
      return { ...i, fromPrice: n !== null ? `от ${formatMoney(n, content.company.currency)} / м²` : null };
    });
}
