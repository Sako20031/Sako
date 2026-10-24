import type { SiteContent } from '@/types';
import { company } from './company';
import { pricing } from './pricing';
import { catalog } from './catalog';
import { portfolio } from './portfolio';
import { faq } from './faq';
import { about, hero, process, trust } from './content';

/** Built-in content. The admin panel stores overrides per section on top of it. */
export const defaultContent: SiteContent = { company, hero, pricing, catalog, portfolio, faq, about, process, trust };

export const contentSections = Object.keys(defaultContent) as (keyof SiteContent)[];
