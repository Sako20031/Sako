// Room geometry, independent of the UI. All lengths are metres.
// Every supported shape is converted to a polygon, and area / perimeter /
// corners are computed from that polygon, so there is a single source of truth.
import type { LShape, Modifier, Point, Room, RoomMetrics, RoomShape, Wall } from '../types/index.ts';

export const LIMITS = { minSide: 0.3, maxSide: 50, minHeight: 2, maxHeight: 8, maxPoints: 40 } as const;

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function rectMetrics(length: number, width: number) {
  return { area: round2(length * width), perimeter: round2(2 * (length + width)) };
}

/** Shoelace formula; positive for counter-clockwise in a y-up system. */
export function signedArea(pts: Point[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

export const polygonArea = (pts: Point[]) => Math.abs(signedArea(pts));

export function polygonPerimeter(pts: Point[]): number {
  let p = 0;
  for (let i = 0; i < pts.length; i++) p += dist(pts[i], pts[(i + 1) % pts.length]);
  return p;
}

export const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

function cross(o: Point, a: Point, b: Point) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  const eps = 1e-9;
  if (((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps))) {
    return true;
  }
  const onSeg = (p: Point, q: Point, r: Point) =>
    Math.min(p.x, r.x) - eps <= q.x && q.x <= Math.max(p.x, r.x) + eps && Math.min(p.y, r.y) - eps <= q.y && q.y <= Math.max(p.y, r.y) + eps;
  if (Math.abs(d1) <= eps && onSeg(p3, p1, p4)) return true;
  if (Math.abs(d2) <= eps && onSeg(p3, p2, p4)) return true;
  if (Math.abs(d3) <= eps && onSeg(p1, p3, p2)) return true;
  if (Math.abs(d4) <= eps && onSeg(p1, p4, p2)) return true;
  return false;
}

/** True when no two non-adjacent edges touch and no two vertices coincide. */
export function isSimplePolygon(pts: Point[]): boolean {
  const n = pts.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (dist(pts[i], pts[j]) < 1e-6) return false;
    }
  }
  for (let i = 0; i < n; i++) {
    const a1 = pts[i];
    const a2 = pts[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      // Skip adjacent edges (they share a vertex by construction).
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      if (segmentsIntersect(a1, a2, pts[j], pts[(j + 1) % n])) return false;
    }
  }
  return true;
}

/** Removes vertices that lie on a straight line between their neighbours. */
export function dropCollinear(pts: Point[]): Point[] {
  if (pts.length <= 3) return pts;
  const out = pts.filter((p, i) => {
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const next = pts[(i + 1) % pts.length];
    return Math.abs(cross(prev, p, next)) > 1e-9;
  });
  return out.length >= 3 ? out : pts;
}

/**
 * Corners seen from inside the room: internal (interior angle < 180°, the
 * usual room corner) and external (> 180°, a protruding corner).
 */
export function classifyCorners(pts: Point[]): { internal: number; external: number } {
  const poly = dropCollinear(pts);
  const orientation = Math.sign(signedArea(poly)) || 1;
  let internal = 0;
  let external = 0;
  for (let i = 0; i < poly.length; i++) {
    const prev = poly[(i - 1 + poly.length) % poly.length];
    const next = poly[(i + 1) % poly.length];
    const turn = cross(prev, poly[i], next) * orientation;
    if (turn > 0) internal++;
    else if (turn < 0) external++;
  }
  return { internal, external };
}

/* ───────────────────────── Shape → polygon ───────────────────────── */

const pos = (v: number | null): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

function sideError(label: string, v: number | null): string | null {
  if (v === null || v === undefined || Number.isNaN(v)) return `Укажите ${label}.`;
  if (v <= 0) return `${capitalize(label)} должна быть больше нуля.`;
  if (v < LIMITS.minSide) return `${capitalize(label)} меньше ${LIMITS.minSide} м — проверьте значение.`;
  if (v > LIMITS.maxSide) return `${capitalize(label)} больше ${LIMITS.maxSide} м — для таких помещений нужен замер.`;
  return null;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function rectPolygon(l: number, w: number): Point[] {
  return [
    { x: 0, y: 0 },
    { x: l, y: 0 },
    { x: l, y: w },
    { x: 0, y: w },
  ];
}

/** L-shape: an L × W outline with a cutLength × cutWidth corner removed (top-right). */
export function lshapeCutoutPolygon(L: number, W: number, cl: number, cw: number): Point[] {
  return [
    { x: 0, y: 0 },
    { x: L - cl, y: 0 },
    { x: L - cl, y: cw },
    { x: L, y: cw },
    { x: L, y: W },
    { x: 0, y: W },
  ];
}

/**
 * Two sections sharing one wall line, aligned at the left: section B is
 * measured only beyond section A, so no area is counted twice.
 */
export function lshapeSectionsPolygon(a: { l: number; w: number }, b: { l: number; w: number }): Point[] {
  const pts: Point[] = [{ x: 0, y: 0 }, { x: a.l, y: 0 }, { x: a.l, y: a.w }];
  if (b.l !== a.l) pts.push({ x: b.l, y: a.w });
  pts.push({ x: b.l, y: a.w + b.w }, { x: 0, y: a.w + b.w });
  return dropCollinear(pts);
}

/**
 * Rectangle with niches (outward) and protrusions (inward) along its walls.
 * Modifiers on the same wall are spread evenly, in the order given.
 */
export function modifiersPolygon(l: number, w: number, mods: Modifier[]): Point[] {
  // Walk clockwise in screen coordinates (y down): top → right → bottom → left.
  const walls: { wall: Wall; start: Point; dir: Point; out: Point; len: number }[] = [
    { wall: 'top', start: { x: 0, y: 0 }, dir: { x: 1, y: 0 }, out: { x: 0, y: -1 }, len: l },
    { wall: 'right', start: { x: l, y: 0 }, dir: { x: 0, y: 1 }, out: { x: 1, y: 0 }, len: w },
    { wall: 'bottom', start: { x: l, y: w }, dir: { x: -1, y: 0 }, out: { x: 0, y: 1 }, len: l },
    { wall: 'left', start: { x: 0, y: w }, dir: { x: 0, y: -1 }, out: { x: -1, y: 0 }, len: w },
  ];
  const pts: Point[] = [];
  for (const wl of walls) {
    pts.push(wl.start);
    const on = mods.filter((m) => m.wall === wl.wall && pos(m.width) && pos(m.depth));
    if (!on.length) continue;
    const used = on.reduce((s, m) => s + (m.width as number), 0);
    const gap = (wl.len - used) / (on.length + 1);
    let t = gap;
    for (const m of on) {
      const d = (m.kind === 'niche' ? 1 : -1) * (m.depth as number);
      const at = (k: number, o: number): Point => ({
        x: wl.start.x + wl.dir.x * k + wl.out.x * o,
        y: wl.start.y + wl.dir.y * k + wl.out.y * o,
      });
      const mw = m.width as number;
      pts.push(at(t, 0), at(t, d), at(t + mw, d), at(t + mw, 0));
      t += mw + gap;
    }
  }
  return dropCollinear(pts.map((p) => ({ x: round4(p.x), y: round4(p.y) })));
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;

function validateModifiers(l: number, w: number, mods: Modifier[]): string[] {
  const errors: string[] = [];
  const wallLen = (wall: Wall) => (wall === 'top' || wall === 'bottom' ? l : w);
  const across = (wall: Wall) => (wall === 'top' || wall === 'bottom' ? w : l);
  const names: Record<Wall, string> = { top: 'верхней', right: 'правой', bottom: 'нижней', left: 'левой' };
  mods.forEach((m, i) => {
    const label = m.kind === 'niche' ? `Ниша ${i + 1}` : `Выступ ${i + 1}`;
    if (!pos(m.width) || !pos(m.depth)) {
      errors.push(`${label}: укажите ширину и глубину.`);
      return;
    }
    if (m.width > wallLen(m.wall)) errors.push(`${label} шире ${names[m.wall]} стены.`);
    if (m.depth > LIMITS.maxSide) errors.push(`${label}: слишком большая глубина.`);
    if (m.kind === 'protrusion' && m.depth >= across(m.wall)) errors.push(`${label} глубже самой комнаты.`);
  });
  for (const wall of ['top', 'right', 'bottom', 'left'] as Wall[]) {
    const sum = mods.filter((m) => m.wall === wall && pos(m.width)).reduce((s, m) => s + (m.width as number), 0);
    if (sum > wallLen(wall) + 1e-9) errors.push(`На ${names[wall]} стене элементы не помещаются по ширине.`);
  }
  return errors;
}

function lshapeGeometry(s: LShape): { polygon: Point[] | null; errors: string[] } {
  if (s.method === 'cutout') {
    const errors = [
      sideError('общую длину', s.length),
      sideError('общую ширину', s.width),
      sideError('длину выреза', s.cutLength),
      sideError('ширину выреза', s.cutWidth),
    ].filter(Boolean) as string[];
    if (errors.length) return { polygon: null, errors };
    const [L, W, cl, cw] = [s.length!, s.width!, s.cutLength!, s.cutWidth!];
    if (cl >= L) errors.push('Длина выреза должна быть меньше общей длины.');
    if (cw >= W) errors.push('Ширина выреза должна быть меньше общей ширины.');
    if (errors.length) return { polygon: null, errors };
    return { polygon: lshapeCutoutPolygon(L, W, cl, cw), errors };
  }
  const errors = [
    sideError('длину части A', s.a.length),
    sideError('ширину части A', s.a.width),
    sideError('длину части B', s.b.length),
    sideError('глубину части B', s.b.width),
  ].filter(Boolean) as string[];
  if (errors.length) return { polygon: null, errors };
  return {
    polygon: lshapeSectionsPolygon({ l: s.a.length!, w: s.a.width! }, { l: s.b.length!, w: s.b.width! }),
    errors,
  };
}

export function shapePolygon(shape: RoomShape): { polygon: Point[] | null; errors: string[] } {
  switch (shape.kind) {
    case 'rect': {
      const errors = [sideError('длину', shape.rect.length), sideError('ширину', shape.rect.width)].filter(Boolean) as string[];
      if (errors.length) return { polygon: null, errors };
      return { polygon: rectPolygon(shape.rect.length!, shape.rect.width!), errors };
    }
    case 'lshape':
      return lshapeGeometry(shape.lshape);
    case 'niches':
    case 'protrusions': {
      const errors = [sideError('длину', shape.rect.length), sideError('ширину', shape.rect.width)].filter(Boolean) as string[];
      if (errors.length) return { polygon: null, errors };
      const l = shape.rect.length!;
      const w = shape.rect.width!;
      const mErrors = validateModifiers(l, w, shape.modifiers);
      if (mErrors.length) return { polygon: null, errors: mErrors };
      return { polygon: modifiersPolygon(l, w, shape.modifiers), errors: [] };
    }
    case 'custom': {
      if (shape.custom.mode === 'manual') return { polygon: null, errors: [] };
      return validatePolygon(shape.custom.points);
    }
  }
}

export function validatePolygon(points: Point[]): { polygon: Point[] | null; errors: string[] } {
  if (points.length < 3) return { polygon: null, errors: ['Контур должен содержать минимум 3 точки.'] };
  if (points.length > LIMITS.maxPoints) return { polygon: null, errors: [`Не больше ${LIMITS.maxPoints} точек.`] };
  if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return { polygon: null, errors: ['Некорректные координаты точек.'] };
  if (!isSimplePolygon(points)) {
    return { polygon: null, errors: ['Стены контура пересекаются или точки совпадают — переместите точки, чтобы контур не перекрещивался.'] };
  }
  if (points.some((p, i) => dist(p, points[(i + 1) % points.length]) < 0.1)) {
    return { polygon: null, errors: ['Одна из стен короче 10 см — уберите лишнюю точку.'] };
  }
  if (polygonArea(points) < 1) return { polygon: null, errors: ['Площадь контура меньше 1 м² — проверьте размеры.'] };
  return { polygon: points, errors: [] };
}

/* ───────────────────────── Room metrics ───────────────────────── */

export function heightError(h: number | null): string | null {
  if (h === null) return null; // optional
  if (!Number.isFinite(h) || h <= 0) return 'Высота должна быть больше нуля.';
  if (h < LIMITS.minHeight) return `Высота меньше ${LIMITS.minHeight} м — проверьте значение.`;
  if (h > LIMITS.maxHeight) return `Высота больше ${LIMITS.maxHeight} м — для таких помещений нужен замер.`;
  return null;
}

export function roomMetrics(room: Pick<Room, 'shape' | 'height' | 'sloped'>): RoomMetrics {
  const { shape } = room;
  const hErr = heightError(room.height);

  if (shape.kind === 'custom' && shape.custom.mode === 'manual') {
    const { manualArea, manualPerimeter } = shape.custom;
    const errors: string[] = [];
    if (manualArea !== null && !(manualArea > 0 && manualArea <= 2500)) errors.push('Площадь должна быть от 0 до 2500 м².');
    if (manualPerimeter !== null && !(manualPerimeter > 0 && manualPerimeter <= 400)) errors.push('Периметр должен быть от 0 до 400 м.');
    if (manualArea !== null && manualPerimeter !== null && errors.length === 0) {
      // A shape of area A has perimeter at least that of a circle: 2√(πA).
      if (manualPerimeter < 2 * Math.sqrt(Math.PI * manualArea) - 0.01) errors.push('При такой площади периметр не может быть таким маленьким — проверьте значения.');
    }
    if (hErr) errors.push(hErr);
    const known = manualArea !== null && errors.length === 0;
    return {
      valid: known,
      errors,
      area: known ? round2(manualArea!) : null,
      perimeter: known && manualPerimeter !== null ? round2(manualPerimeter) : null,
      corners: null,
      polygon: null,
      needsMeasurement: true,
      source: known ? 'manual' : 'none',
    };
  }

  const { polygon, errors } = shapePolygon(shape);
  if (hErr) errors.push(hErr);
  if (!polygon || errors.length) {
    return { valid: false, errors, area: null, perimeter: null, corners: null, polygon, needsMeasurement: true, source: 'none' };
  }
  return {
    valid: true,
    errors: [],
    area: round2(polygonArea(polygon)),
    perimeter: round2(polygonPerimeter(polygon)),
    corners: classifyCorners(polygon),
    polygon,
    needsMeasurement: shape.kind === 'custom' || room.sloped,
    source: 'geometry',
  };
}

/* ───────────────────────── Editing helpers ───────────────────────── */

export const snap = (v: number, step = 0.05) => Math.round(v / step) * step;

/**
 * Sets the length of wall i (point i → i+1) by moving point i+1 along the
 * wall, and shifting every later point with it so other walls keep their
 * length and direction. The closing wall absorbs the change.
 */
export function setWallLength(points: Point[], i: number, length: number): Point[] {
  const n = points.length;
  if (i < 0 || i >= n - 1 || !(length > 0)) return points;
  const a = points[i];
  const b = points[i + 1];
  const cur = dist(a, b);
  if (cur < 1e-9) return points;
  const k = length / cur;
  const dx = (b.x - a.x) * (k - 1);
  const dy = (b.y - a.y) * (k - 1);
  return points.map((p, j) => (j > i ? { x: round4(p.x + dx), y: round4(p.y + dy) } : p));
}

/** Moves the whole outline so its bounding box starts at (0, 0). */
export function normalizePolygon(points: Point[]): Point[] {
  const minX = Math.min(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  return points.map((p) => ({ x: round4(p.x - minX), y: round4(p.y - minY) }));
}

export function boundingBox(points: Point[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
