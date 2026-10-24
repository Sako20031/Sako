import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCorners, isSimplePolygon, lshapeCutoutPolygon, lshapeSectionsPolygon, modifiersPolygon, polygonArea, polygonPerimeter, rectMetrics, roomMetrics, setWallLength } from '../lib/geometry.ts';
import { emptyShape } from '../lib/rooms.ts';
import type { Room } from '../types/index.ts';

const room = (patch: (s: Room['shape']) => void, extra: Partial<Room> = {}) => {
  const shape = emptyShape();
  patch(shape);
  return { shape, height: null, sloped: false, ...extra };
};

test('rectangle 5 × 4 → 20 m², 18 m', () => {
  assert.deepEqual(rectMetrics(5, 4), { area: 20, perimeter: 18 });
  const m = roomMetrics(room((s) => (s.rect = { length: 5, width: 4 })));
  assert.equal(m.valid, true);
  assert.equal(m.area, 20);
  assert.equal(m.perimeter, 18);
  assert.deepEqual(m.corners, { internal: 4, external: 0 });
});

test('rectangle 4 × 3 → 12 m², 14 m', () => {
  const m = roomMetrics(room((s) => (s.rect = { length: 4, width: 3 })));
  assert.equal(m.area, 12);
  assert.equal(m.perimeter, 14);
});

test('rejects empty, zero, negative and implausible sizes', () => {
  for (const [l, w] of [[null, 4], [0, 4], [-2, 4], [5, 120]] as const) {
    const m = roomMetrics(room((s) => (s.rect = { length: l, width: w })));
    assert.equal(m.valid, false, `${l}×${w}`);
    assert.ok(m.errors.length > 0);
  }
  const h = roomMetrics(room((s) => (s.rect = { length: 5, width: 4 }), { height: 1.2 }));
  assert.equal(h.valid, false);
});

test('L-shape by cutout: 6×5 minus 2.5×2 = 25 m², perimeter 22 m, 5 internal + 1 external corners', () => {
  const p = lshapeCutoutPolygon(6, 5, 2.5, 2);
  assert.equal(polygonArea(p), 25);
  assert.equal(polygonPerimeter(p), 22);
  assert.deepEqual(classifyCorners(p), { internal: 5, external: 1 });
});

test('L-shape by sections does not double count: 5×4 + 3×2 = 26 m²', () => {
  const p = lshapeSectionsPolygon({ l: 5, w: 4 }, { l: 3, w: 2 });
  assert.equal(polygonArea(p), 26);
  assert.equal(polygonPerimeter(p), 22);
  const m = roomMetrics(room((s) => { s.kind = 'lshape'; s.lshape.method = 'sections'; s.lshape.a = { length: 5, width: 4 }; s.lshape.b = { length: 3, width: 2 }; }));
  assert.equal(m.area, 26);
});

test('niche adds area, protrusion subtracts; each adds 2 × depth to the perimeter', () => {
  const niche = modifiersPolygon(5, 4, [{ id: 'a', kind: 'niche', wall: 'top', width: 2, depth: 0.5 }]);
  assert.equal(polygonArea(niche), 21);
  assert.equal(polygonPerimeter(niche), 19);
  assert.deepEqual(classifyCorners(niche), { internal: 6, external: 2 });
  const box = modifiersPolygon(5, 4, [{ id: 'b', kind: 'protrusion', wall: 'right', width: 1, depth: 0.6 }]);
  assert.ok(Math.abs(polygonArea(box) - 19.4) < 1e-9);
  assert.ok(Math.abs(polygonPerimeter(box) - 19.2) < 1e-9);
});

test('modifier wider than the wall is rejected', () => {
  const m = roomMetrics(room((s) => { s.kind = 'niches'; s.rect = { length: 3, width: 3 }; s.modifiers = [{ id: 'x', kind: 'niche', wall: 'top', width: 4, depth: 1 }]; }));
  assert.equal(m.valid, false);
});

test('self-intersecting polygon is rejected', () => {
  const bow = [{ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 4, y: 0 }, { x: 0, y: 4 }];
  assert.equal(isSimplePolygon(bow), false);
  const m = roomMetrics(room((s) => { s.kind = 'custom'; s.custom.points = bow; }));
  assert.equal(m.valid, false);
  assert.equal(m.needsMeasurement, true);
});

test('setWallLength keeps other walls and closes with the last one', () => {
  const sq = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }];
  const out = setWallLength(sq, 0, 5);
  assert.deepEqual(out, [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 3 }, { x: 1, y: 3 }]);
});

test('manual fallback: unknown size needs measurement, impossible perimeter is rejected', () => {
  const unknown = roomMetrics(room((s) => { s.kind = 'custom'; s.custom.mode = 'manual'; }));
  assert.equal(unknown.area, null);
  assert.equal(unknown.needsMeasurement, true);
  const bad = roomMetrics(room((s) => { s.kind = 'custom'; s.custom.mode = 'manual'; s.custom.manualArea = 100; s.custom.manualPerimeter = 10; }));
  assert.equal(bad.valid, false);
});
