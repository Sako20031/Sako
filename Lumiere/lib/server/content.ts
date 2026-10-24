import 'server-only';
import { unstable_cache } from 'next/cache';
import { defaultContent } from '@/config';
import type { ContentSection, SiteContent } from '@/types';
import { kvGetMany } from './store';

export const CONTENT_TAG = 'lumiere-content';

async function loadContent(): Promise<SiteContent> {
  let overrides: Record<string, unknown> = {};
  try {
    overrides = await kvGetMany('content:');
  } catch (e) {
    // A database outage must not take the site down: fall back to built-in content.
    console.error('[content] using defaults:', e);
  }
  const content = structuredClone(defaultContent);
  for (const [key, value] of Object.entries(overrides)) {
    const section = key.slice('content:'.length) as ContentSection;
    if (section in content && value !== null && value !== undefined) {
      (content as unknown as Record<string, unknown>)[section] = value;
    }
  }
  return content;
}

/** Site content: built-in defaults overridden by sections saved in the admin panel. */
export const getContent = unstable_cache(loadContent, ['lumiere-content-v1'], { tags: [CONTENT_TAG], revalidate: 3600 });

/** Uncached read for the admin panel. */
export const getContentFresh = loadContent;
