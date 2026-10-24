// Input schemas, shared by the server (authoritative) and the client (hints).
import { z } from 'zod';
import { LIMITS } from './geometry.ts';

const text = (max: number) => z.string().trim().max(max);
const id = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const slug = z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, 'Только латиница, цифры и дефис');
const num = (min: number, max: number) => z.number().min(min).max(max);
const dim = num(0, LIMITS.maxSide * 2).nullable();
const price = z.number().min(0).max(1_000_000_000).nullable();
/** Site-relative path or https URL — never javascript: or data: */
const imageUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === '' || v.startsWith('/') || /^https:\/\/[^\s"'<>]+$/.test(v), 'Ссылка на изображение должна начинаться с https:// или /');

/* ───────────────────────── Project (calculator) ───────────────────────── */

const point = z.object({ x: num(-100, 100), y: num(-100, 100) });
const rectDims = z.object({ length: dim, width: dim });
const qty = z.union([num(0, 1000), z.literal('unknown')]);

export const roomSchema = z.object({
  id,
  name: text(80).min(1, 'Укажите название комнаты'),
  type: z.enum(['living', 'bedroom', 'kitchen', 'bathroom', 'hallway', 'kids', 'commercial', 'other']),
  shape: z.object({
    kind: z.enum(['rect', 'lshape', 'protrusions', 'niches', 'custom']),
    rect: rectDims,
    lshape: z.object({
      method: z.enum(['cutout', 'sections']),
      length: dim,
      width: dim,
      cutLength: dim,
      cutWidth: dim,
      a: rectDims,
      b: rectDims,
    }),
    modifiers: z
      .array(z.object({ id, kind: z.enum(['niche', 'protrusion']), wall: z.enum(['top', 'right', 'bottom', 'left']), width: dim, depth: dim }))
      .max(20),
    custom: z.object({
      mode: z.enum(['draw', 'manual']),
      points: z.array(point).max(LIMITS.maxPoints),
      manualArea: num(0, 10000).nullable(),
      manualPerimeter: num(0, 1000).nullable(),
    }),
  }),
  height: num(0, 20).nullable(),
  approximate: z.boolean(),
  sloped: z.boolean(),
  technical: z.record(z.string().max(32), qty),
  technicalNotes: text(1000),
  materialId: z.string().max(64).nullable(),
  colorId: z.string().max(64).nullable(),
  temperature: text(60).nullable(),
  lighting: z.record(z.string().max(64), num(0, 1000)),
  curtain: z.object({ enabled: z.boolean(), typeId: z.string().max(64).nullable(), length: num(0, 200).nullable() }),
  services: z.record(z.string().max(64), num(0, 1000)),
  notes: text(1000),
});

export const projectSchema = z.object({
  id: z.string().regex(/^LC-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
  rooms: z.array(roomSchema).min(1, 'Добавьте хотя бы одну комнату').max(30),
  activeRoomId: z.string().max(64).nullable(),
  notes: text(1500),
});

/* ───────────────────────── Lead ───────────────────────── */

export const leadSchema = z.object({
  name: text(80).min(2, 'Укажите имя'),
  phone: text(40).min(5, 'Укажите телефон'),
  contactMethod: z.enum(['call', 'whatsapp', 'telegram']),
  callTime: text(80),
  address: text(200),
  comment: text(1500),
  measurement: z.boolean(),
  consent: z.literal(true, { error: 'Нужно согласие на обработку данных' }),
  /** Honeypot: real people never fill this hidden field. */
  website: z.string().max(0).optional().or(z.literal('')),
  /** Milliseconds since the form was shown — bots submit instantly. */
  elapsedMs: z.number().min(0).max(1e10),
  submissionKey: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
  project: projectSchema.nullable(),
});

export type LeadInput = z.infer<typeof leadSchema>;

/* ───────────────────────── Admin content sections ───────────────────────── */

const textBlock = z.object({ title: text(120), text: text(1500) });

export const contentSchemas = {
  company: z.object({
    brandName: text(80).min(1),
    logoText: text(40).min(1),
    logoImage: imageUrl,
    tagline: text(160),
    phone: text(40),
    whatsapp: z.string().trim().max(20).regex(/^\d*$/, 'WhatsApp — только цифры с кодом страны, например 77001234567'),
    email: z.union([z.literal(''), z.email('Некорректный e-mail').max(120)]),
    address: text(300),
    instagram: text(120),
    hours: text(160),
    serviceAreas: z.array(z.object({ slug, name: text(80).min(1), description: text(1500) })).max(50),
    legalName: text(200),
    legalId: text(60),
    warranty: text(3000),
    country: z.object({ code: text(4).min(2), dialCode: z.string().regex(/^\+\d{1,4}$/), nationalDigits: z.number().int().min(6).max(12), example: text(40) }),
    currency: z.object({ code: text(6).min(3), symbol: text(6).min(1), locale: text(16).min(2) }),
  }),
  hero: z.object({
    title: text(140).min(1),
    subtitle: text(400),
    primaryCta: text(40).min(1),
    secondaryCta: text(40).min(1),
    measureLink: text(60),
    image: imageUrl.refine((v) => v !== '', 'Нужна фотография'),
    imageAlt: text(200),
    focus: z.string().regex(/^\d{1,3}% \d{1,3}%$/),
    benefits: z.array(text(60)).max(6),
  }),
  pricing: z.object({
    mode: z.enum(['off', 'sample', 'live']),
    installationPerM2: price,
    minimumOrder: price,
    highCeiling: z.object({ thresholdM: num(2, 10), pricePerM2: price }),
    discount: z.object({ enabled: z.boolean(), percent: num(0, 100), minTotal: price, label: text(80) }),
    materials: z
      .array(
        z.object({
          id,
          name: text(80).min(1),
          short: text(160),
          description: text(1500),
          image: imageUrl,
          pricePerM2: price,
          minCharge: price,
          profileId: id,
          incompatibleLighting: z.array(id).max(30),
          incompatibilityNote: text(400),
          requiresInspection: z.boolean(),
          enabled: z.boolean(),
        }),
      )
      .max(30),
    profiles: z.array(z.object({ id, name: text(80).min(1), description: text(300), pricePerM: price })).max(20),
    lighting: z
      .array(
        z.object({
          id,
          name: text(80).min(1),
          description: text(400),
          unit: z.enum(['item', 'm', 'perimeter']),
          price,
          defaultQty: num(0, 1000),
          maxQty: num(1, 1000),
          needsInspection: z.boolean(),
          enabled: z.boolean(),
        }),
      )
      .max(30),
    extras: z
      .array(
        z.object({
          id: z.enum(['internalCorner', 'externalCorner', 'pipe', 'riser', 'vent', 'niche', 'protrusion', 'junction', 'obstacle', 'column']),
          label: text(80).min(1),
          hint: text(400),
          unit: z.enum(['item', 'm']),
          price,
          included: num(0, 100),
        }),
      )
      .max(20),
    curtains: z.array(z.object({ id, name: text(80).min(1), description: text(300), pricePerM: price })).max(20),
    colors: z.array(z.object({ id, name: text(60).min(1), hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/), surchargePerM2: price })).max(30),
    temperatures: z.array(text(40).min(1)).max(10),
    services: z
      .array(z.object({ id, name: text(80).min(1), description: text(300), unit: z.enum(['m2', 'm', 'item', 'fixed']), price, enabled: z.boolean() }))
      .max(40),
  }),
  catalog: z
    .array(
      z.object({
        id,
        slug,
        category: text(40),
        name: text(120).min(1),
        short: text(300),
        description: text(3000),
        rooms: z.array(text(60)).max(20),
        features: z.array(text(80)).max(20),
        lighting: z.array(text(80)).max(20),
        materialId: z.string().max(64),
        startingPrice: price,
        image: imageUrl,
        imageAlt: text(200),
        gallery: z.array(imageUrl).max(12),
        enabled: z.boolean(),
      }),
    )
    .max(60),
  portfolio: z
    .array(
      z.object({
        id,
        slug,
        kind: z.enum(['concept', 'project']),
        title: text(140).min(1),
        roomType: z.enum(['living', 'bedroom', 'kitchen', 'bathroom', 'hallway', 'kids', 'commercial', 'other']),
        style: text(80),
        ceiling: text(200),
        lighting: text(200),
        materials: text(200),
        description: text(3000),
        cover: imageUrl,
        coverAlt: text(200),
        gallery: z.array(imageUrl).max(20),
        price: text(80),
        completedAt: text(40),
        published: z.boolean(),
      }),
    )
    .max(200),
  faq: z.array(z.object({ id, question: text(200).min(1), answer: text(3000).min(1) })).max(60),
  about: z.object({ title: text(140).min(1), intro: text(800), paragraphs: z.array(text(1500)).max(10), values: z.array(textBlock).max(8) }),
  process: z.object({ confirmed: z.boolean(), steps: z.array(textBlock).min(1).max(10) }),
  trust: z.object({ items: z.array(textBlock).max(12) }),
} as const;

export function firstError(e: z.ZodError): string {
  const issue = e.issues[0];
  if (!issue) return 'Некорректные данные';
  const path = issue.path.join('.');
  return path ? `${issue.message} (${path})` : issue.message;
}
