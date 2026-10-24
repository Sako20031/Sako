import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateProject, NO_PRICES_MESSAGE } from '../lib/pricing.ts';
import { newRoom } from '../lib/rooms.ts';
import type { PricingConfig, Room } from '../types/index.ts';

// A small, explicit price list so expected totals are easy to check by hand.
const pricing = (): PricingConfig => ({
  mode: 'live',
  installationPerM2: 1000,
  minimumOrder: null,
  highCeiling: { thresholdM: 3.2, pricePerM2: 300 },
  discount: { enabled: false, percent: 10, minTotal: null, label: 'Скидка' },
  materials: [{ id: 'matte', name: 'Матовый', short: '', description: '', image: '', pricePerM2: 2000, minCharge: null, profileId: 'std', incompatibleLighting: ['floatingLed'], incompatibilityNote: 'Нужен парящий профиль', requiresInspection: false, enabled: true }],
  profiles: [{ id: 'std', name: 'Профиль', description: '', pricePerM: 500 }],
  lighting: [
    { id: 'spots', name: 'Точечные', description: '', unit: 'item', price: 2000, defaultQty: 4, maxQty: 50, needsInspection: false, enabled: true },
    { id: 'floatingLed', name: 'Парящая лента', description: '', unit: 'perimeter', price: 4000, defaultQty: 1, maxQty: 1, needsInspection: true, enabled: true },
  ],
  extras: [
    { id: 'internalCorner', label: 'Внутренние углы', hint: '', unit: 'item', price: 300, included: 4 },
    { id: 'externalCorner', label: 'Внешние углы', hint: '', unit: 'item', price: 500, included: 0 },
    { id: 'pipe', label: 'Трубы', hint: '', unit: 'item', price: 1500, included: 0 },
  ],
  curtains: [{ id: 'hidden', name: 'Скрытый карниз', description: '', pricePerM: 6000 }],
  colors: [{ id: 'white', name: 'Белый', hex: '#FFFFFF', surchargePerM2: 0 }],
  temperatures: [],
  services: [],
});

const rect = (type: Room['type'], l: number, w: number): Room => {
  const r = newRoom(type, [], 'matte');
  r.shape.rect = { length: l, width: w };
  return r;
};

test('customer journey: living 5×4 + bedroom 4×3 with spots, curtain, pipe and an extra corner', () => {
  const living = rect('living', 5, 4);
  living.lighting = { spots: 6 };
  living.curtain = { enabled: true, typeId: 'hidden', length: 4 };
  living.technical = { pipe: 1, internalCorner: 5 };
  const bedroom = rect('bedroom', 4, 3);
  const est = estimateProject([living, bedroom], pricing());

  const [l, b] = est.rooms;
  assert.equal(l.metrics.area, 20);
  assert.equal(l.metrics.perimeter, 18);
  assert.equal(b.metrics.area, 12);
  assert.equal(b.metrics.perimeter, 14);

  // Living: 20×2000 + 20×1000 + 18×500 + 6×2000 + 4×6000 + 1×1500 + (5−4)×300
  assert.equal(l.subtotal, 40000 + 20000 + 9000 + 12000 + 24000 + 1500 + 300);
  // Bedroom: 12×2000 + 12×1000 + 14×500
  assert.equal(b.subtotal, 24000 + 12000 + 7000);
  assert.equal(est.total, l.subtotal + b.subtotal);
  assert.equal(est.categoryTotals.lighting, 12000);
  assert.equal(est.categoryTotals.elements, 24000);
  assert.equal(est.categoryTotals.works, 1800);
  assert.equal(est.incomplete, false);
  assert.equal(est.available, true);
});

test('no configured prices → calculation is unavailable with the required message', () => {
  const p = pricing();
  p.installationPerM2 = null;
  const est = estimateProject([rect('living', 5, 4)], p);
  assert.equal(est.available, false);
  assert.equal(est.message, NO_PRICES_MESSAGE);
  p.installationPerM2 = 1000;
  p.mode = 'off';
  assert.equal(estimateProject([rect('living', 5, 4)], p).available, false);
});

test('incompatible lighting is excluded and explained', () => {
  const r = rect('living', 5, 4);
  r.lighting = { floatingLed: 1 };
  const est = estimateProject([r], pricing());
  assert.equal(est.categoryTotals.lighting, 0);
  assert.ok(est.rooms[0].issues.some((i) => i.includes('Нужен парящий профиль')));
});

test('"не знаю" quantities become pending lines and mark the estimate incomplete', () => {
  const r = rect('kitchen', 3, 3);
  r.technical = { pipe: 'unknown' };
  const est = estimateProject([r], pricing());
  const line = est.rooms[0].lines.find((x) => x.label === 'Трубы');
  assert.equal(line?.amount, null);
  assert.equal(line?.kind, 'pending');
  assert.equal(est.incomplete, true);
});

test('minimum order, high ceiling and discount rules', () => {
  const p = pricing();
  p.minimumOrder = 100000;
  const small = rect('hallway', 2, 1);
  small.height = 3.5;
  const est = estimateProject([small], p);
  // 2×2000 + 2×1000 + 2×300 (high) + 6×500
  assert.equal(est.subtotal, 4000 + 2000 + 600 + 3000);
  assert.equal(est.minimumAdjustment, 100000 - est.subtotal);
  assert.equal(est.total, 100000);
  p.discount = { enabled: true, percent: 10, minTotal: 50000, label: 'Скидка' };
  const d = estimateProject([small], p);
  assert.equal(d.discount, 10000);
  assert.equal(d.total, 90000);
});

test('L-shaped room gets geometry-derived external corner priced automatically', () => {
  const r = newRoom('living', [], 'matte');
  r.shape.kind = 'lshape';
  r.shape.lshape = { ...r.shape.lshape, method: 'cutout', length: 6, width: 5, cutLength: 2.5, cutWidth: 2 };
  const est = estimateProject([r], pricing());
  const works = est.rooms[0].lines.filter((l) => l.category === 'works');
  // 5 internal (1 over the included 4) and 1 external
  assert.deepEqual(works.map((w) => w.amount), [300, 500]);
});
