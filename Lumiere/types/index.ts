// Shared domain types. Pure data — no React, no Node APIs — so the same
// shapes are used by the UI, the pricing engine, the API and the tests.

/* ───────────────────────── Company & site content ───────────────────────── */

export interface ServiceArea {
  slug: string;
  name: string;
  description: string;
}

export interface CompanyConfig {
  brandName: string;
  logoText: string;
  /** Optional logo image URL; when empty the text logo is used. */
  logoImage: string;
  tagline: string;
  phone: string;
  /** Digits only with country code, e.g. 77001234567. Empty = WhatsApp disabled. */
  whatsapp: string;
  email: string;
  address: string;
  instagram: string;
  hours: string;
  serviceAreas: ServiceArea[];
  legalName: string;
  legalId: string;
  warranty: string;
  country: { code: string; dialCode: string; nationalDigits: number; example: string };
  currency: { code: string; symbol: string; locale: string };
}

export interface HeroContent {
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  measureLink: string;
  image: string;
  imageAlt: string;
  /** Focal point of the photo for object-position, e.g. "50% 40%". */
  focus: string;
  benefits: string[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface TextBlock {
  title: string;
  text: string;
}

export interface AboutContent {
  title: string;
  intro: string;
  paragraphs: string[];
  values: TextBlock[];
}

export interface ProcessContent {
  steps: TextBlock[];
  /** Until the company confirms its workflow, the section carries a note. */
  confirmed: boolean;
}

export interface TrustContent {
  items: TextBlock[];
}

/* ───────────────────────── Catalog & portfolio ───────────────────────── */

export interface CatalogItem {
  id: string;
  slug: string;
  category: string;
  name: string;
  short: string;
  description: string;
  rooms: string[];
  features: string[];
  lighting: string[];
  /** Material preselected in the calculator when the customer picks this design. */
  materialId: string;
  /** Manual "from" price per m²; null = derived from pricing (if configured). */
  startingPrice: number | null;
  image: string;
  imageAlt: string;
  gallery: string[];
  enabled: boolean;
}

export type PortfolioKind = 'concept' | 'project';

export interface PortfolioItem {
  id: string;
  slug: string;
  kind: PortfolioKind;
  title: string;
  roomType: RoomType;
  style: string;
  ceiling: string;
  lighting: string;
  materials: string;
  description: string;
  cover: string;
  coverAlt: string;
  gallery: string[];
  /** Real project price as text, only for real projects. */
  price: string;
  completedAt: string;
  published: boolean;
}

/* ───────────────────────── Pricing configuration ───────────────────────── */

/** 'off' — no prices shown; 'sample' — demo prices, labelled; 'live' — confirmed company prices. */
export type PricingMode = 'off' | 'sample' | 'live';
export type PriceUnit = 'm2' | 'm' | 'item' | 'fixed';
export type LightingUnit = 'item' | 'm' | 'perimeter';

export interface MaterialOption {
  id: string;
  name: string;
  short: string;
  description: string;
  image: string;
  pricePerM2: number | null;
  minCharge: number | null;
  profileId: string;
  /** Lighting options that cannot be combined with this material. */
  incompatibleLighting: string[];
  incompatibilityNote: string;
  requiresInspection: boolean;
  enabled: boolean;
}

export interface ProfileOption {
  id: string;
  name: string;
  description: string;
  pricePerM: number | null;
}

export interface LightingOption {
  id: string;
  name: string;
  description: string;
  unit: LightingUnit;
  price: number | null;
  defaultQty: number;
  maxQty: number;
  needsInspection: boolean;
  enabled: boolean;
}

export type ExtraId =
  | 'internalCorner'
  | 'externalCorner'
  | 'pipe'
  | 'riser'
  | 'vent'
  | 'niche'
  | 'protrusion'
  | 'junction'
  | 'obstacle'
  | 'column';

export interface ExtraWork {
  id: ExtraId;
  label: string;
  hint: string;
  unit: 'item' | 'm';
  price: number | null;
  /** Quantity included in the base price, e.g. 4 corners of a rectangle. */
  included: number;
}

export interface CurtainOption {
  id: string;
  name: string;
  description: string;
  pricePerM: number | null;
}

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  surchargePerM2: number | null;
}

export interface ServiceOption {
  id: string;
  name: string;
  description: string;
  unit: PriceUnit;
  price: number | null;
  enabled: boolean;
}

export interface PricingConfig {
  mode: PricingMode;
  installationPerM2: number | null;
  minimumOrder: number | null;
  highCeiling: { thresholdM: number; pricePerM2: number | null };
  discount: { enabled: boolean; percent: number; minTotal: number | null; label: string };
  materials: MaterialOption[];
  profiles: ProfileOption[];
  lighting: LightingOption[];
  extras: ExtraWork[];
  curtains: CurtainOption[];
  colors: ColorOption[];
  temperatures: string[];
  services: ServiceOption[];
}

export interface SiteContent {
  company: CompanyConfig;
  hero: HeroContent;
  pricing: PricingConfig;
  catalog: CatalogItem[];
  portfolio: PortfolioItem[];
  faq: FaqItem[];
  about: AboutContent;
  process: ProcessContent;
  trust: TrustContent;
}

export type ContentSection = keyof SiteContent;

/* ───────────────────────── Calculator project ───────────────────────── */

export type RoomType =
  | 'living'
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'hallway'
  | 'kids'
  | 'commercial'
  | 'other';

export type ShapeKind = 'rect' | 'lshape' | 'protrusions' | 'niches' | 'custom';
export type Wall = 'top' | 'right' | 'bottom' | 'left';

export interface Point {
  x: number;
  y: number;
}

export interface RectDims {
  length: number | null;
  width: number | null;
}

/** A niche adds ceiling area, a protrusion (box, column at a wall) removes it. */
export interface Modifier {
  id: string;
  kind: 'niche' | 'protrusion';
  wall: Wall;
  width: number | null;
  depth: number | null;
}

export interface LShape {
  method: 'cutout' | 'sections';
  /** Overall size and the missing corner. */
  length: number | null;
  width: number | null;
  cutLength: number | null;
  cutWidth: number | null;
  /** Or two sections: B is measured only beyond A, so nothing is counted twice. */
  a: RectDims;
  b: RectDims;
}

export interface CustomShape {
  mode: 'draw' | 'manual';
  points: Point[];
  manualArea: number | null;
  manualPerimeter: number | null;
}

export interface RoomShape {
  kind: ShapeKind;
  rect: RectDims;
  lshape: LShape;
  modifiers: Modifier[];
  custom: CustomShape;
}

/** A quantity the customer may not know yet. */
export type Qty = number | 'unknown';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  shape: RoomShape;
  height: number | null;
  approximate: boolean;
  sloped: boolean;
  technical: Partial<Record<ExtraId, Qty>>;
  technicalNotes: string;
  materialId: string | null;
  colorId: string | null;
  temperature: string | null;
  lighting: Record<string, number>;
  curtain: { enabled: boolean; typeId: string | null; length: number | null };
  services: Record<string, number>;
  notes: string;
}

export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  rooms: Room[];
  activeRoomId: string | null;
  notes: string;
}

/* ───────────────────────── Geometry & estimate results ───────────────────────── */

export interface RoomMetrics {
  valid: boolean;
  errors: string[];
  area: number | null;
  perimeter: number | null;
  corners: { internal: number; external: number } | null;
  polygon: Point[] | null;
  /** Extra shapes drawn on top (sections) — only for preview. */
  needsMeasurement: boolean;
  source: 'geometry' | 'manual' | 'none';
}

export type LineCategory = 'covering' | 'installation' | 'profile' | 'lighting' | 'elements' | 'works';

/** estimated — depends on measured area/perimeter; fixed — unit price × known count; pending — specialist will confirm. */
export type LineKind = 'estimated' | 'fixed' | 'pending';

export interface EstimateLine {
  category: LineCategory;
  label: string;
  qty: number | null;
  unit: PriceUnit;
  unitPrice: number | null;
  amount: number | null;
  kind: LineKind;
  note?: string;
}

export interface RoomEstimate {
  roomId: string;
  roomName: string;
  metrics: RoomMetrics;
  lines: EstimateLine[];
  subtotal: number;
  /** Something selected has no configured price or quantity. */
  incomplete: boolean;
  issues: string[];
  inspection: string[];
}

export interface ProjectEstimate {
  available: boolean;
  mode: PricingMode;
  message: string | null;
  rooms: RoomEstimate[];
  categoryTotals: Record<LineCategory, number>;
  subtotal: number;
  minimumAdjustment: number;
  discount: number;
  total: number;
  incomplete: boolean;
  totalArea: number;
  totalPerimeter: number;
}

/* ───────────────────────── Leads ───────────────────────── */

export type LeadStatus = 'new' | 'work' | 'done' | 'cancel';

export interface Lead {
  id: string;
  createdAt: number;
  status: LeadStatus;
  name: string;
  phone: string;
  contactMethod: string;
  callTime: string;
  address: string;
  comment: string;
  measurement: boolean;
  projectId: string;
  summary: string;
  total: number | null;
  project: Project | null;
}

/** Catalog item with its display price resolved on the server. */
export interface CatalogEntry extends CatalogItem {
  fromPrice: string | null;
}
