// Generates the placeholder illustrations in src/assets/media/*.svg.
// Run: node scripts/build-art.mjs  — replace any file with a real photo later
// (and update src/config/media.ts).
import { writeFileSync } from 'node:fs';
import { scooterGroup, scooterDefs } from './scooter.mjs';

const out = new URL('../src/assets/media/', import.meta.url);
const svg = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${defs}</defs>${body}</svg>\n`;

/* ---------------------------------------------------------------- scooters */
for (const v of ['compact', 'touring', 'maxi']) {
  writeFileSync(new URL(`scooter-${v}.svg`, out), svg(480, 300, scooterGroup(v), scooterDefs(v)));
}

/* ---------------------------------------------------------------- hero */
{
  const houses = [];
  // white houses on the cliff (Balcón de Europa feel)
  const rows = [
    [40, 404, 10], [70, 396, 9], [100, 410, 8], [150, 400, 9], [200, 416, 7], [250, 428, 7], [300, 440, 6], [350, 456, 6],
    [20, 440, 7], [80, 446, 8], [140, 440, 7], [190, 452, 7], [240, 464, 6], [290, 478, 6],
  ];
  for (const [x, y, s] of rows) {
    const w = s * 7, h = s * 5;
    houses.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FFFFFF"/>`);
    houses.push(`<rect x="${x}" y="${y}" width="${w * 0.35}" height="${h}" fill="#EFE4D4"/>`);
    houses.push(`<path d="M${x - 2} ${y} L${x + w / 2} ${y - s * 1.6} L${x + w + 2} ${y} Z" fill="#D98B5A"/>`);
    houses.push(`<rect x="${x + w * 0.55}" y="${y + h * 0.35}" width="${s * 0.9}" height="${s * 1.3}" fill="#123744" opacity=".55"/>`);
  }
  const glints = [];
  for (let i = 0; i < 26; i++) {
    const y = 612 + i * 15 + i * i * 0.5;
    const w = 40 + i * 9;
    const op = (0.85 - i * 0.028).toFixed(2);
    glints.push(`<rect x="${1180 - w / 2 + Math.sin(i * 1.7) * 18}" y="${y}" width="${w}" height="${2 + i * 0.18}" rx="2" fill="#F8C77E" opacity="${op}"/>`);
  }
  const waves = [];
  for (let i = 0; i < 18; i++) {
    const y = 640 + i * 18 + i * i * 0.4;
    const x = (i * 377) % 1500;
    waves.push(`<path d="M${x} ${y} q30 -6 60 0 t60 0" stroke="#FFFFFF" stroke-opacity=".12" stroke-width="2" fill="none"/>`);
  }
  const balusters = [];
  for (let x = -10; x < 1620; x += 26) balusters.push(`<rect x="${x}" y="812" width="9" height="52" rx="3" fill="#FFFFFF"/>`);
  const tiles = [];
  for (let i = -6; i < 16; i++) tiles.push(`<path d="M${800 + i * 60} 870 L${800 + i * 150} 1000" stroke="#D6C0A0" stroke-width="2"/>`);
  for (const y of [900, 940, 985]) tiles.push(`<path d="M0 ${y} H1600" stroke="#D6C0A0" stroke-width="2"/>`);

  const palm = (x, y, s, c = '#123744') => `
    <g transform="translate(${x} ${y}) scale(${s})" fill="${c}">
      <path d="M0 0 C-6 -120 -30 -240 -10 -360 L4 -360 C-14 -240 10 -120 14 0 Z"/>
      ${[[-150, -330, -40], [-120, -300, -20], [140, -330, 30], [120, -296, 50], [-40, -440, -80], [60, -440, 80], [0, -460, 0]].map(
        ([dx, dy]) => `<path d="M-4 -362 C${dx * 0.4} ${dy - 40} ${dx * 0.8} ${dy - 20} ${dx} ${dy + 30} C${dx * 0.7} ${dy - 6} ${dx * 0.35} ${dy - 14} -4 -356 Z"/>`,
      ).join('')}
    </g>`;

  const defs = `
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FBF3E6"/>
      <stop offset=".55" stop-color="#FAE6CB"/>
      <stop offset="1" stop-color="#F6C68A"/>
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2F7C8F"/>
      <stop offset=".25" stop-color="#0E5B73"/>
      <stop offset="1" stop-color="#123744"/>
    </linearGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#F6A43A" stop-opacity=".55"/>
      <stop offset="1" stop-color="#F6A43A" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cliff" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E9D2B2"/>
      <stop offset="1" stop-color="#C9A880"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#EBDCC4"/>
      <stop offset="1" stop-color="#E2CDAE"/>
    </linearGradient>
    ${scooterDefs('touring')}`;
  const body = `
    <rect width="1600" height="610" fill="url(#sky)"/>
    <circle cx="1180" cy="560" r="300" fill="url(#glow)"/>
    <circle cx="1180" cy="566" r="66" fill="#F6A43A"/>
    <path d="M520 600 C600 560 680 540 760 548 C860 520 940 540 1000 560 C1080 548 1180 570 1260 580 C1360 560 1480 566 1600 556 V604 H520 Z" fill="#B8A79A" opacity=".45"/>
    <path d="M700 604 C780 584 860 576 940 586 C1020 574 1100 590 1180 596 L1180 606 H700 Z" fill="#9C8F86" opacity=".35"/>
    <rect y="600" width="1600" height="400" fill="url(#sea)"/>
    ${glints.join('')}
    ${waves.join('')}
    <path d="M0 360 C60 350 120 370 180 380 C260 390 320 410 380 436 C440 460 500 500 560 560 L600 606 L0 606 Z" fill="url(#cliff)"/>
    <path d="M0 520 C120 520 240 540 380 560 C450 572 520 590 600 606 L0 606 Z" fill="#B48E66" opacity=".55"/>
    ${houses.join('')}
    ${palm(330, 470, 0.32, '#5E6E5C')}
    ${palm(190, 446, 0.28, '#5E6E5C')}
    <!-- promenade -->
    <rect y="804" width="1600" height="12" fill="#FFFFFF"/>
    ${balusters.join('')}
    <rect y="860" width="1600" height="12" fill="#F4EBDD"/>
    <rect y="870" width="1600" height="130" fill="url(#floor)"/>
    ${tiles.join('')}
    ${palm(1530, 900, 1.25)}
    <g transform="translate(930 655) scale(1.05)">${scooterGroup('touring')}</g>`;
  writeFileSync(new URL('hero.svg', out), svg(1600, 1000, body, defs));
}

/* ---------------------------------------------------------------- story: coastal road */
{
  const defs = `
    <linearGradient id="s-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDEBEE"/><stop offset="1" stop-color="#FBF3E6"/></linearGradient>
    <linearGradient id="s-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3F8A9C"/><stop offset="1" stop-color="#0E5B73"/></linearGradient>`;
  const body = `
    <rect width="900" height="1100" fill="url(#s-sky)"/>
    <circle cx="690" cy="210" r="54" fill="#F6A43A" opacity=".9"/>
    <path d="M0 330 C120 300 220 320 320 300 C420 280 520 310 640 290 C740 274 820 300 900 290 V470 H0 Z" fill="#A9B9B8" opacity=".55"/>
    <rect y="460" width="900" height="640" fill="url(#s-sea)"/>
    ${Array.from({ length: 14 }, (_, i) => `<path d="M${(i * 213) % 820} ${500 + i * 38} q24 -5 48 0 t48 0" stroke="#fff" stroke-opacity=".18" stroke-width="2" fill="none"/>`).join('')}
    <path d="M900 380 C800 400 720 470 680 560 C640 660 600 760 520 860 C460 940 380 1020 300 1100 H900 Z" fill="#D9BE9C"/>
    <path d="M900 470 C840 500 790 560 760 640 C720 740 680 840 600 940 C560 990 520 1040 480 1100 H900 Z" fill="#C7A27A"/>
    <path d="M900 520 C850 560 820 620 800 690 C770 790 730 890 660 990 L620 1100 H900 Z" fill="#5E6E5C" opacity=".35"/>
    <!-- road -->
    <path d="M900 600 C840 640 800 700 770 780 C740 860 700 960 640 1100 L760 1100 C800 980 840 880 870 800 C885 760 895 740 900 730 Z" fill="#3A4A50"/>
    <path d="M890 640 C850 680 820 740 800 800 C780 870 752 960 708 1080" stroke="#FBF3E6" stroke-width="5" stroke-dasharray="26 22" fill="none"/>
    ${Array.from({ length: 7 }, (_, i) => `<rect x="${742 - i * 26 + i * i}" y="${720 + i * 56}" width="7" height="22" fill="#fff" transform="rotate(18 ${742 - i * 26} ${720 + i * 56})"/>`).join('')}
    <g transform="translate(560 860) scale(.42) rotate(-8)">${scooterGroup('compact')}</g>`;
  writeFileSync(new URL('story.svg', out), svg(900, 1100, body, scooterDefs('compact') + defs));
}

/* ---------------------------------------------------------------- destinations */
const card = (name, body, defs = '') => writeFileSync(new URL(`${name}.svg`, out), svg(800, 1000, body, defs));

// Frigiliana: white village on a hillside, bougainvillea
{
  const houses = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let row = 0; row < 9; row++) {
    for (let i = 0; i < 7; i++) {
      const x = i * 120 + (row % 2) * 60 - 40 + rnd() * 20;
      const y = 330 + row * 70 + Math.abs(i - 3) * 10;
      const w = 90 + rnd() * 30, h = 70 + rnd() * 20;
      houses.push(`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="#FFFFFF"/>`);
      houses.push(`<rect x="${(x + w * 0.62).toFixed(0)}" y="${y.toFixed(0)}" width="${(w * 0.38).toFixed(0)}" height="${h.toFixed(0)}" fill="#ECE3D6"/>`);
      houses.push(`<rect x="${(x - 4).toFixed(0)}" y="${(y - 8).toFixed(0)}" width="${(w + 8).toFixed(0)}" height="10" fill="#C77A4E"/>`);
      if (rnd() > 0.35) houses.push(`<rect x="${(x + 18).toFixed(0)}" y="${(y + 24).toFixed(0)}" width="16" height="24" rx="8" fill="#0E5B73"/>`);
      if (rnd() > 0.55) houses.push(`<circle cx="${(x + w * 0.2).toFixed(0)}" cy="${(y + 6).toFixed(0)}" r="${(10 + rnd() * 12).toFixed(0)}" fill="#C2386E" opacity=".85"/>`);
      if (rnd() > 0.8) houses.push(`<rect x="${(x + w * 0.6).toFixed(0)}" y="${(y + 30).toFixed(0)}" width="14" height="14" fill="#F6A43A"/>`);
    }
  }
  card('frigiliana', `
    <rect width="800" height="1000" fill="#F3E3C9"/>
    <path d="M0 260 C140 200 260 150 400 170 C540 150 660 210 800 230 V1000 H0 Z" fill="#B9A58C" opacity=".6"/>
    <path d="M0 330 C200 270 360 260 520 280 C640 290 720 310 800 320 V1000 H0 Z" fill="#DCC9AE"/>
    ${houses.join('')}
    <path d="M0 960 L800 900 V1000 H0 Z" fill="#E9DDCB"/>
    <circle cx="640" cy="120" r="46" fill="#F6A43A"/>`);
}

// Maro / Cueva de Nerja: aqueduct (Puente del Águila) across a green ravine, sea below
{
  const sky = '#E6EEEE';
  const arches = [];
  const tiers = [[300, 8, 92], [392, 8, 92], [484, 7, 100]];
  for (const [y, n, h] of tiers) {
    const w = 440 / n;
    for (let i = 0; i < n; i++) {
      const x = 180 + i * w + (y === 484 ? w / 2 : 0);
      const aw = w * 0.62, ax = x + (w - aw) / 2;
      arches.push(`<path d="M${ax} ${y + h - 8} V${y + aw / 2 + 14} A${aw / 2} ${aw / 2} 0 0 1 ${ax + aw} ${y + aw / 2 + 14} V${y + h - 8} Z" fill="${sky}"/>`);
    }
    arches.push(`<rect x="180" y="${y + h - 10}" width="440" height="6" fill="#A86A4C"/>`);
  }
  card('maro', `
    <rect width="800" height="1000" fill="${sky}"/>
    <circle cx="150" cy="140" r="44" fill="#F6A43A" opacity=".9"/>
    <path d="M0 250 C180 210 340 200 520 220 C640 230 720 210 800 200 V1000 H0 Z" fill="#B5C4BB" opacity=".7"/>
    <path d="M180 286 H620 V596 H180 Z" fill="#C98F6A"/>
    <path d="M176 280 H624 V296 H176 Z" fill="#B37A57"/>
    ${arches.join('')}
    <path d="M0 300 C80 300 150 360 190 460 C220 540 250 600 260 660 L0 700 Z" fill="#6D7C66"/>
    <path d="M800 300 C720 300 650 360 610 460 C580 540 550 600 540 660 L800 700 Z" fill="#5E6E5C"/>
    <path d="M0 640 C160 600 300 660 400 650 C520 640 660 600 800 630 V1000 H0 Z" fill="#7F8E73"/>
    <rect y="780" width="800" height="220" fill="#0E5B73"/>
    ${Array.from({ length: 10 }, (_, i) => `<path d="M${(i * 173) % 720} ${810 + i * 18} q20 -5 40 0 t40 0" stroke="#fff" stroke-opacity=".22" stroke-width="2" fill="none"/>`).join('')}
    <path d="M0 760 C120 740 240 770 340 790 L0 840 Z" fill="#E3CBA6"/>
    <path d="M560 780 C620 720 700 690 800 680 V1000 H640 C640 900 600 830 560 780 Z" fill="#C9A880"/>
    <path d="M660 860 C690 836 730 838 748 868 C736 896 700 904 672 892 Z" fill="#1C2A30" opacity=".7"/>`);
}

// La Herradura: horseshoe bay seen from the sea, headlands on both sides
{
  const houses = [];
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    const x = 130 + t * 540;
    const y = 520 + Math.sin(t * Math.PI) * 50 - 18 - (i % 3) * 14;
    houses.push(`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${18 + (i % 4) * 4}" height="${16 + (i % 3) * 5}" fill="#FFFFFF"/>`);
  }
  card('herradura', `
    <rect width="800" height="1000" fill="#FBF3E6"/>
    <circle cx="560" cy="170" r="50" fill="#F6A43A"/>
    <path d="M0 380 C120 280 240 250 340 300 C440 240 600 250 800 330 V1000 H0 Z" fill="#8FA49F" opacity=".7"/>
    <path d="M0 450 C160 410 280 430 400 440 C520 430 660 410 800 430 V1000 H0 Z" fill="#B7A68F"/>
    <path d="M0 520 C200 500 600 500 800 520 V1000 H0 Z" fill="#C9B79A"/>
    ${houses.join('')}
    <path d="M90 560 C200 640 600 640 710 560 L710 600 C600 680 200 680 90 600 Z" fill="#F1E2C6"/>
    <path d="M0 600 C60 600 80 590 92 586 C200 664 600 664 708 586 C720 590 740 600 800 600 V1000 H0 Z" fill="#0E5B73"/>
    <path d="M0 480 C70 470 120 500 150 560 C130 600 80 640 0 660 Z" fill="#5E6E5C"/>
    <path d="M800 470 C730 460 680 500 650 560 C670 610 720 650 800 670 Z" fill="#6D7C66"/>
    <rect y="900" width="800" height="100" fill="#123744" opacity=".6"/>
    ${Array.from({ length: 12 }, (_, i) => `<path d="M${120 + ((i * 97) % 520)} ${690 + i * 18} q18 -4 36 0 t36 0" stroke="#fff" stroke-opacity=".22" stroke-width="2" fill="none"/>`).join('')}
    <path d="M520 800 l40 -6 -6 10 Z" fill="#FFFFFF"/><path d="M548 760 v36 l-20 -2 Z" fill="#FFFFFF"/>`);
}

console.log('art written to src/assets/media');
