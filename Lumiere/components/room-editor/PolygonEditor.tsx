'use client';

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Point } from '@/types';
import { boundingBox, dist, isSimplePolygon, LIMITS, lshapeCutoutPolygon, normalizePolygon, polygonArea, polygonPerimeter, rectPolygon, setWallLength, snap } from '@/lib/geometry';
import { formatNumber } from '@/lib/format';
import { NumberField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';

/**
 * Touch-friendly top-down outline editor: drag corners, tap "+" on a wall to
 * add a corner, select a corner to delete it, or type exact wall lengths.
 */
export function PolygonEditor({ points, onChange }: { points: Point[]; onChange: (pts: Point[]) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ index: number; view: View } | null>(null);
  const [ortho, setOrtho] = useState(true);
  const [history, setHistory] = useState<Point[][]>([]);

  const commit = (next: Point[], record = true) => {
    if (record) setHistory((h) => [...h.slice(-30), points]);
    onChange(next);
  };

  const view = useMemo(() => computeView(points), [points]);
  const v = drag?.view ?? view; // freeze the viewport while dragging
  const simple = isSimplePolygon(points);
  const area = polygonArea(points);
  const perimeter = polygonPerimeter(points);

  const toWorld = (e: PointerEvent): Point | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const placePoint = (i: number, raw: Point): Point => {
    let x = snap(raw.x);
    let y = snap(raw.y);
    if (ortho && points.length > 2) {
      const prev = points[(i - 1 + points.length) % points.length];
      const next = points[(i + 1) % points.length];
      const tol = v.size * 0.03;
      for (const n of [prev, next]) {
        if (Math.abs(x - n.x) < tol) x = n.x;
        if (Math.abs(y - n.y) < tol) y = n.y;
      }
    }
    return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 };
  };

  const onPointerDown = (i: number) => (e: PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setSelected(i);
    setHistory((h) => [...h.slice(-30), points]);
    setDrag({ index: i, view });
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag) return;
    const w = toWorld(e);
    if (!w) return;
    const next = points.slice();
    next[drag.index] = placePoint(drag.index, w);
    commit(next, false);
  };
  const endDrag = () => {
    if (!drag) return;
    setDrag(null);
    commit(normalizePolygon(points), false);
  };

  const insertAfter = (i: number) => {
    if (points.length >= LIMITS.maxPoints) return;
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const next = [...points.slice(0, i + 1), { x: snap((a.x + b.x) / 2), y: snap((a.y + b.y) / 2) }, ...points.slice(i + 1)];
    commit(next);
    setSelected(i + 1);
  };
  const removeSelected = () => {
    if (selected === null || points.length <= 3) return;
    commit(points.filter((_, j) => j !== selected));
    setSelected(null);
  };
  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    onChange(prev);
  };

  const onKey = (i: number) => (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.5 : 0.05;
    const d: Record<string, Point> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    if (d[e.key]) {
      e.preventDefault();
      const next = points.slice();
      next[i] = { x: Math.round((points[i].x + d[e.key].x) * 1000) / 1000, y: Math.round((points[i].y + d[e.key].y) * 1000) / 1000 };
      commit(next);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeSelected();
    }
  };

  const r = v.size * 0.022; // handle radius in world units
  const font = v.size * 0.032;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ') + 'Z';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => commit(rectPolygon(5, 4))}>
          Прямоугольник
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => commit(lshapeCutoutPolygon(6, 5, 2.5, 2))}>
          Г-образная заготовка
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={undo} disabled={!history.length}>
          <Icon name="undo" size={16} /> Отменить
        </button>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-ink" checked={ortho} onChange={(e) => setOrtho(e.target.checked)} />
          Выравнивать по прямым углам
        </label>
      </div>

      <div className="relative overflow-hidden rounded-[4px] border border-line bg-paper">
        <svg
          ref={svgRef}
          viewBox={`${v.x} ${v.y} ${v.size} ${v.size * 0.75}`}
          className="block aspect-[4/3] w-full select-none"
          style={{ touchAction: 'none' }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerDown={(e) => {
            if (e.target === svgRef.current) setSelected(null);
          }}
          role="application"
          aria-label="Редактор контура комнаты. Выберите угол и перемещайте его стрелками; Delete удаляет угол."
        >
          <defs>
            <pattern id="editor-grid" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M1 0H0V1" fill="none" stroke="#242321" strokeOpacity="0.08" strokeWidth={v.size * 0.0015} />
            </pattern>
          </defs>
          <rect x={v.x} y={v.y} width={v.size} height={v.size * 0.75} fill="url(#editor-grid)" pointerEvents="none" />
          <path d={d} fill={simple ? '#efe7da' : '#f4dcd5'} stroke={simple ? '#242321' : '#a63d2f'} strokeWidth={v.size * 0.004} strokeLinejoin="round" pointerEvents="none" />

          {points.map((p, i) => {
            const q = points[(i + 1) % points.length];
            const mx = (p.x + q.x) / 2;
            const my = (p.y + q.y) / 2;
            const len = dist(p, q);
            return (
              <g key={`w${i}`}>
                <text x={mx} y={my - r * 1.6} fontSize={font} textAnchor="middle" fill="#66615a" pointerEvents="none" fontFamily="var(--font-manrope)">
                  {formatNumber(len)} м
                </text>
                {len > 0.6 && points.length < LIMITS.maxPoints && (
                  <g role="button" aria-label={`Добавить угол на стене ${i + 1}`} tabIndex={0} className="cursor-copy" onPointerDown={(e) => { e.stopPropagation(); insertAfter(i); }} onKeyDown={(e) => e.key === 'Enter' && insertAfter(i)}>
                    <circle cx={mx} cy={my} r={r * 1.5} fill="transparent" />
                    <circle cx={mx} cy={my} r={r * 0.7} fill="#fff" stroke="#b79a72" strokeWidth={v.size * 0.003} />
                    <path d={`M${mx - r * 0.35} ${my}H${mx + r * 0.35}M${mx} ${my - r * 0.35}V${my + r * 0.35}`} stroke="#7a6142" strokeWidth={v.size * 0.003} />
                  </g>
                )}
              </g>
            );
          })}

          {points.map((p, i) => (
            <g key={`p${i}`} role="button" tabIndex={0} aria-label={`Угол ${i + 1}: ${formatNumber(p.x)} на ${formatNumber(p.y)} м`} onPointerDown={onPointerDown(i)} onKeyDown={onKey(i)} onFocus={() => setSelected(i)} className="cursor-grab outline-none">
              <circle cx={p.x} cy={p.y} r={r * 2.2} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={selected === i ? r * 1.05 : r * 0.8} fill={selected === i ? '#242321' : '#fff'} stroke="#242321" strokeWidth={v.size * 0.004} />
              <text x={p.x} y={p.y + r * 2.6} fontSize={font * 0.8} textAnchor="middle" fill="#858078" pointerEvents="none">
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-[2px] bg-ink/70 px-2.5 py-1 text-xs text-white">Сетка — 1 м</div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted">
          Перетащите углы, нажмите <span className="font-semibold text-champagne-deep">+</span> на стене, чтобы добавить угол.
        </span>
        <button type="button" className="btn btn-outline btn-sm ml-auto" onClick={removeSelected} disabled={selected === null || points.length <= 3}>
          <Icon name="trash" size={16} /> Удалить угол {selected !== null ? selected + 1 : ''}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-[4px] bg-stone/60 p-4 text-center sm:grid-cols-3">
        <Metric label="Площадь" value={simple ? `${formatNumber(area)} м²` : '—'} />
        <Metric label="Периметр" value={simple ? `${formatNumber(perimeter)} м` : '—'} />
        <Metric label="Углов" value={String(points.length)} />
      </div>

      <details className="group rounded-[4px] border border-line bg-paper">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
          Точные длины стен
          <Icon name="chevronDown" className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-2">
          {points.map((p, i) => {
            const len = Math.round(dist(p, points[(i + 1) % points.length]) * 100) / 100;
            const closing = i === points.length - 1;
            return closing ? (
              <div key={i} className="text-sm">
                <p className="field-label">
                  Стена {i + 1}–1 (замыкающая)
                </p>
                <p className="field flex items-center bg-stone/40 tabular-nums text-muted">{formatNumber(len)} м — рассчитывается</p>
              </div>
            ) : (
              <NumberField key={i} label={`Стена ${i + 1}–${i + 2}`} unit="м" value={len} onChange={(val) => val && val > 0 && commit(setWallLength(points, i, val))} />
            );
          })}
          <p className="field-hint sm:col-span-2">Изменение длины сдвигает следующие углы; последняя стена замыкает контур. Это предварительная геометрия — точные размеры снимет замерщик.</p>
        </div>
      </details>
    </div>
  );
}

interface View {
  x: number;
  y: number;
  size: number;
}

function computeView(points: Point[]): View {
  const bb = boundingBox(points);
  const w = bb.maxX - bb.minX;
  const h = bb.maxY - bb.minY;
  const size = Math.max(8, w * 1.35, (h * 1.35) / 0.75);
  return { x: bb.minX + w / 2 - size / 2, y: bb.minY + h / 2 - (size * 0.75) / 2, size };
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}
