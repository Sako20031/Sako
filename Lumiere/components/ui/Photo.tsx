'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

type Props = Omit<ImageProps, 'src' | 'alt'> & { src: string; alt: string };

/** Hosts whose images go through next/image optimisation. */
const OPTIMIZED_HOSTS = ['images.unsplash.com'];

function isOptimizable(src: string) {
  if (src.startsWith('/')) return true;
  try {
    return OPTIMIZED_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

/**
 * next/image with a graceful architectural placeholder when a photo is
 * missing or fails to load, so a broken link never breaks the layout.
 */
export function Photo({ src, alt, className = '', ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <PhotoFallback className={className} label={alt} fill={Boolean(rest.fill)} />;
  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      unoptimized={!isOptimizable(src)}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}

export function PhotoFallback({ className = '', label, fill = true }: { className?: string; label?: string; fill?: boolean }) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      className={`${fill ? 'absolute inset-0' : 'h-full w-full'} overflow-hidden bg-[linear-gradient(160deg,#efe9df_0%,#e3dccf_45%,#cfc5b4_100%)] ${className}`}
    >
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="glow" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stopColor="#fffaf0" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#fffaf0" stopOpacity="0" />
          </radialGradient>
        </defs>
        <polygon points="0,0 400,0 330,70 70,70" fill="#f7f3ec" />
        <polygon points="0,0 70,70 70,300 0,300" fill="#ddd4c6" />
        <polygon points="400,0 330,70 330,300 400,300" fill="#d6ccbc" />
        <rect x="70" y="70" width="260" height="230" fill="#e8e1d5" />
        <rect x="0" y="0" width="400" height="140" fill="url(#glow)" />
        <line x1="120" y1="38" x2="280" y2="38" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        {[110, 160, 200, 240, 290].map((x) => (
          <circle key={x} cx={x} cy={56} r="2.6" fill="#fff" />
        ))}
        <line x1="70" y1="70" x2="330" y2="70" stroke="#fff" strokeWidth="1.5" opacity="0.8" />
      </svg>
    </div>
  );
}
