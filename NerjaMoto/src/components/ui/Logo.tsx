/** Brand symbol: a low sun over two waves, inside a wheel-like ring. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" strokeWidth="1" opacity=".35" />
      <path d="M11 21a9 9 0 0 1 18 0Z" fill="#F6A43A" />
      <path d="M8 24.5c2.4-1.6 4.6-1.6 7 0s4.6 1.6 7 0 4.6-1.6 7 0 3.4 1 4 .6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.5 28.5c2-1.2 3.8-1.2 5.8 0s3.8 1.2 5.8 0 3.8-1.2 5.8 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <LogoMark />
      <span className="wordmark__text">
        <span className="wordmark__name">Nerja</span>
        <span className="wordmark__sub">Moto Rent</span>
      </span>
    </span>
  );
}
