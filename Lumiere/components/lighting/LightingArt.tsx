// Small illustrations of lighting options: a ceiling plane in perspective
// with the light effect drawn on it. Pure SVG — no photos to load.
export function LightingArt({ id, className = '' }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 160 100" className={`block h-full w-full ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={`la-bg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2926" />
          <stop offset="1" stopColor="#3b3833" />
        </linearGradient>
        <radialGradient id={`la-glow-${id}`}>
          <stop offset="0" stopColor="#ffe9c4" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffe9c4" stopOpacity="0" />
        </radialGradient>
        <filter id={`la-blur-${id}`}>
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <rect width="160" height="100" fill={`url(#la-bg-${id})`} />
      {/* ceiling plane */}
      <polygon points="18,14 142,14 160,58 0,58" fill="#4a463f" />
      <polygon points="0,58 160,58 160,100 0,100" fill="#302d29" />
      {art(id)}
    </svg>
  );

  function art(kind: string) {
    switch (kind) {
      case 'spots':
        return [30, 55, 80, 105, 130].flatMap((x, i) => [
          <ellipse key={`g${i}`} cx={x} cy={i % 2 ? 40 : 28} rx="12" ry="5" fill={`url(#la-glow-${id})`} />,
          <ellipse key={`s${i}`} cx={x} cy={i % 2 ? 40 : 28} rx="2.6" ry="1.2" fill="#fff8ea" />,
        ]);
      case 'chandelier':
        return (
          <g>
            <ellipse cx="80" cy="34" rx="40" ry="16" fill={`url(#la-glow-${id})`} />
            <line x1="80" y1="34" x2="80" y2="60" stroke="#d9c7a7" strokeWidth="1" />
            <path d="M62 62 Q80 74 98 62" fill="none" stroke="#e8d6b4" strokeWidth="2" />
            {[64, 80, 96].map((x) => (
              <circle key={x} cx={x} cy={x === 80 ? 70 : 64} r="2.4" fill="#fff4dc" />
            ))}
          </g>
        );
      case 'lines':
        return (
          <g>
            <g filter={`url(#la-blur-${id})`}>
              <line x1="22" y1="26" x2="138" y2="26" stroke="#ffe7bf" strokeWidth="5" />
              <line x1="40" y1="44" x2="120" y2="44" stroke="#ffe7bf" strokeWidth="5" />
            </g>
            <line x1="22" y1="26" x2="138" y2="26" stroke="#fffaf0" strokeWidth="1.6" />
            <line x1="40" y1="44" x2="120" y2="44" stroke="#fffaf0" strokeWidth="1.6" />
          </g>
        );
      case 'ledStrip':
        return (
          <g>
            <polygon points="30,20 130,20 140,46 20,46" fill="#3e3a34" />
            <g filter={`url(#la-blur-${id})`}>
              <polygon points="30,20 130,20 140,46 20,46" fill="none" stroke="#ffd9a1" strokeWidth="4" />
            </g>
            <polygon points="30,20 130,20 140,46 20,46" fill="none" stroke="#fff3df" strokeWidth="1" />
          </g>
        );
      case 'floatingLed':
      case 'perimeter':
        return (
          <g>
            <g filter={`url(#la-blur-${id})`}>
              <polyline points="0,58 18,14 142,14 160,58" fill="none" stroke={kind === 'floatingLed' ? '#ffe2b0' : '#ffd29a'} strokeWidth={kind === 'floatingLed' ? 7 : 4} />
            </g>
            <polyline points="0,58 18,14 142,14 160,58" fill="none" stroke="#fffaf0" strokeWidth="1.2" />
          </g>
        );
      case 'track':
        return (
          <g>
            <line x1="26" y1="30" x2="134" y2="30" stroke="#1c1b19" strokeWidth="4" />
            {[44, 72, 100, 124].map((x) => (
              <g key={x}>
                <polygon points={`${x - 10},64 ${x + 10},64 ${x + 3},33 ${x - 3},33`} fill={`url(#la-glow-${id})`} opacity="0.6" />
                <rect x={x - 3} y="30" width="6" height="8" rx="1" fill="#1c1b19" />
              </g>
            ))}
          </g>
        );
      default:
        return <ellipse cx="80" cy="34" rx="34" ry="12" fill={`url(#la-glow-${id})`} />;
    }
  }
}
