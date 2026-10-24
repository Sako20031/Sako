import type { Point } from '@/types';
import { boundingBox, dist } from '@/lib/geometry';
import { formatNumber } from '@/lib/format';

/** Static top-down plan of a room outline with wall lengths. */
export function RoomPlan({ polygon, area, className = '' }: { polygon: Point[] | null; area: number | null; className?: string }) {
  if (!polygon || polygon.length < 3) {
    return (
      <div className={`grid aspect-[4/3] place-items-center rounded-[4px] border border-dashed border-line-strong bg-paper/60 p-6 text-center text-sm text-muted ${className}`}>
        Введите размеры — здесь появится план помещения
      </div>
    );
  }
  const bb = boundingBox(polygon);
  const w = Math.max(bb.maxX - bb.minX, 0.5);
  const h = Math.max(bb.maxY - bb.minY, 0.5);
  const pad = Math.max(w, h) * 0.16;
  const vb = `${bb.minX - pad} ${bb.minY - pad} ${w + pad * 2} ${h + pad * 2}`;
  const font = Math.max(w, h) * 0.045;
  const cx = polygon.reduce((s, p) => s + p.x, 0) / polygon.length;
  const cy = polygon.reduce((s, p) => s + p.y, 0) / polygon.length;
  const d = polygon.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ') + 'Z';

  return (
    <svg viewBox={vb} className={`block aspect-[4/3] w-full rounded-[4px] bg-paper ${className}`} role="img" aria-label={`План помещения${area ? `, площадь ${formatNumber(area)} квадратных метров` : ''}`}>
      <defs>
        <pattern id="plan-grid" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M1 0H0V1" fill="none" stroke="#242321" strokeOpacity="0.06" strokeWidth={0.02} />
        </pattern>
      </defs>
      <rect x={bb.minX - pad} y={bb.minY - pad} width={w + pad * 2} height={h + pad * 2} fill="url(#plan-grid)" />
      <path d={d} fill="#efe7da" stroke="#242321" strokeWidth={Math.max(w, h) * 0.008} strokeLinejoin="round" />
      {polygon.map((p, i) => {
        const q = polygon[(i + 1) % polygon.length];
        const len = dist(p, q);
        if (len < 0.2) return null;
        const mx = (p.x + q.x) / 2;
        const my = (p.y + q.y) / 2;
        // Offset the label outward-ish from the centroid.
        const ox = mx - cx;
        const oy = my - cy;
        const ol = Math.hypot(ox, oy) || 1;
        return (
          <text key={i} x={mx + (ox / ol) * font * 1.3} y={my + (oy / ol) * font * 1.3} fontSize={font} textAnchor="middle" dominantBaseline="middle" fill="#66615a" fontFamily="var(--font-manrope)">
            {formatNumber(len)}
          </text>
        );
      })}
      {area !== null && (
        <text x={cx} y={cy} fontSize={font * 1.6} textAnchor="middle" dominantBaseline="middle" fill="#242321" fontFamily="var(--font-cormorant)">
          {formatNumber(area)} м²
        </text>
      )}
    </svg>
  );
}
