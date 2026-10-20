// Neutral scooter side-view drawings (no brand marks). Base canvas 480×300, ground at y≈272.
// `variant`: compact (small step-through), touring (mid-size), maxi (large with windscreen).

const ink = '#1C2A30';

function wheel(cx, cy, r, disc = false) {
  return `
  <g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${ink}"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.7}" fill="#33444B"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="none" stroke="#6E7F85" stroke-width="2"/>
    ${[0, 72, 144, 216, 288].map((a) => {
      const rad = (a * Math.PI) / 180;
      return `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(rad) * r * 0.6).toFixed(1)}" y2="${(cy + Math.sin(rad) * r * 0.6).toFixed(1)}" stroke="#8F9DA1" stroke-width="${(r * 0.09).toFixed(1)}" stroke-linecap="round"/>`;
    }).join('')}
    ${disc ? `<circle cx="${cx}" cy="${cy}" r="${r * 0.42}" fill="none" stroke="#B9C3C6" stroke-width="3"/>` : ''}
    <circle cx="${cx}" cy="${cy}" r="${r * 0.16}" fill="#D7DEE0"/>
  </g>`;
}

const variants = {
  compact: {
    body: '#FFFFFF', shade: '#E7DCCB', trim: '#0E5B73', seatColor: '#2A3A40',
    rear: [128, 236, 34], front: [362, 236, 34],
    shell: `M60 182 C62 160 86 150 120 150 L236 152 C250 154 256 166 258 196 L292 200
            C302 186 306 150 312 120 C316 100 324 86 338 80 L350 80 C358 104 360 146 354 184
            C350 196 336 202 322 200 L300 214 L250 214 C236 214 228 210 220 206 L130 206 C96 206 66 200 60 182 Z`,
    seat: 'M108 150 C112 134 140 128 176 130 L236 134 C246 136 248 146 240 152 L116 156 C108 156 106 154 108 150 Z',
    bars: 'M336 80 L326 52 M310 50 L346 46',
    mirror: 'M316 50 L304 30 M300 30 l10 -2',
    light: 'M352 92 C360 100 362 116 358 126 L350 124 C352 112 350 100 346 94 Z',
    tail: 'M60 176 l12 -3 0 8 -10 2 Z',
    fender: 'M330 214 C336 196 352 190 368 192 C380 194 390 202 394 212',
    screen: '',
  },
  touring: {
    body: '#123744', shade: '#0B2833', trim: '#F6A43A', seatColor: '#26363C',
    rear: [120, 230, 40], front: [372, 230, 40],
    shell: `M48 170 C52 148 84 136 128 136 L246 140 C262 144 268 166 270 194 L304 198
            C314 182 318 140 324 112 C328 92 338 78 354 72 L372 74 C382 96 386 136 380 172
            C376 188 362 196 346 194 L320 206 L264 208 C250 208 240 204 232 200 L124 202 C84 202 52 192 48 170 Z`,
    seat: 'M98 136 C104 118 136 112 178 114 L246 120 C258 122 260 134 250 140 L106 144 C96 144 94 142 98 136 Z',
    bars: 'M352 74 L342 44 M324 42 L364 38',
    mirror: 'M330 42 L316 18 M311 18 l12 -3',
    light: 'M376 84 C386 94 390 114 386 128 L376 126 C378 112 376 98 370 90 Z',
    tail: 'M48 164 l14 -4 1 9 -13 4 Z',
    fender: 'M334 208 C340 188 358 180 376 182 C390 184 402 194 408 206',
    screen: '',
  },
  maxi: {
    body: '#0E5B73', shade: '#0A4659', trim: '#FBF3E6', seatColor: '#26363C',
    rear: [116, 228, 42], front: [382, 228, 42],
    shell: `M36 164 C40 138 80 124 132 124 L250 130 C268 134 274 160 276 190 L312 194
            C322 176 326 132 332 104 C336 82 348 68 366 62 L388 66 C398 92 402 134 394 172
            C390 188 374 198 356 196 L326 208 L268 210 C254 210 244 206 236 202 L122 204 C76 204 40 192 36 164 Z`,
    seat: 'M90 124 C96 104 132 98 180 100 L250 108 C262 110 264 122 254 128 L98 132 C88 132 86 130 90 124 Z',
    bars: 'M364 64 L352 40 M334 40 L376 36',
    mirror: 'M342 38 L330 16 M325 16 l12 -3',
    light: 'M390 76 C400 88 404 110 400 126 L390 124 C392 108 390 92 384 84 Z',
    tail: 'M36 158 l15 -5 1 10 -14 5 Z',
    fender: 'M344 208 C350 186 368 178 386 180 C400 182 412 192 418 204',
    screen: 'M356 66 C356 40 364 16 380 4 L392 6 C388 24 386 46 388 66 Z',
  },
};

export function scooterGroup(variant) {
  const v = variants[variant];
  const [rx, ry, rr] = v.rear;
  const [fx, fy, fr] = v.front;
  return `
  <g class="scooter-${variant}">
    <ellipse cx="${(rx + fx) / 2}" cy="${ry + rr + 2}" rx="${(fx - rx) / 2 + rr + 10}" ry="9" fill="#1C2A30" opacity=".14"/>
    <!-- swingarm / engine -->
    <path d="M${rx - 6} ${ry - 18} L${rx + 110} ${ry - 26} C${rx + 122} ${ry - 26} ${rx + 126} ${ry - 12} ${rx + 116} ${ry - 4} L${rx + 6} ${ry + 6} Z" fill="#3A4A50"/>
    <path d="M${rx} ${ry - 6} l84 -10" stroke="#5B6B71" stroke-width="3" stroke-linecap="round"/>
    ${wheel(rx, ry, rr)}
    <!-- fork -->
    <path d="M${fx - 18} ${ry - 70} L${fx} ${fy}" stroke="#6E7F85" stroke-width="9" stroke-linecap="round"/>
    ${wheel(fx, fy, fr, true)}
    <path d="${v.fender}" fill="none" stroke="${v.body}" stroke-width="10" stroke-linecap="round"/>
    <path d="${v.shell}" fill="${v.body}"/>
    <path d="${v.shell}" fill="none" stroke="${v.shade}" stroke-width="2" opacity=".7"/>
    <!-- lower shading -->
    <path d="${v.shell}" fill="url(#shade-${variant})"/>
    ${v.screen ? `<path d="${v.screen}" fill="#CFE3EA" opacity=".75"/><path d="${v.screen}" fill="none" stroke="#9FBCC6" stroke-width="2"/>` : ''}
    <path d="${v.seat}" fill="${v.seatColor}"/>
    <path d="${v.seat}" fill="none" stroke="#FFFFFF" stroke-opacity=".12" stroke-width="2"/>
    <!-- grab rail -->
    <path d="M${rx - 52} ${ry - 92} C${rx - 40} ${ry - 104} ${rx - 10} ${ry - 106} ${rx + 10} ${ry - 100}" stroke="#8F9DA1" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="${v.bars}" stroke="${ink}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="${v.mirror}" stroke="${ink}" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="${v.light}" fill="#FFF6E2"/>
    <path d="${v.tail}" fill="#E0573A"/>
    <!-- accent pinstripe -->
    <path d="M${rx - 40} ${ry - 44} C${rx} ${ry - 50} ${rx + 80} ${ry - 50} ${rx + 132} ${ry - 46}" stroke="${v.trim}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>
  </g>`;
}

export function scooterDefs(variant) {
  return `<linearGradient id="shade-${variant}" x1="0" y1="0" x2="0" y2="1">
      <stop offset=".55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".22"/>
    </linearGradient>`;
}
