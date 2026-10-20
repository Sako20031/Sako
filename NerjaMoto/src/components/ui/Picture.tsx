import type { Media } from '../../config/media';

interface Props {
  media: Media;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/** Image with fixed intrinsic size (no layout shift) and lazy loading below the fold. */
export function Picture({ media, alt, className, priority = false, sizes }: Props) {
  return (
    <img
      className={className}
      src={media.src}
      srcSet={media.srcSet}
      width={media.width}
      height={media.height}
      alt={alt}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      {...(priority ? { fetchpriority: 'high' } : {})}
    />
  );
}
