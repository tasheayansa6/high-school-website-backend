import { useState } from 'react';

import type { FeaturedImage } from '@/services/api/apiTypes';
import { cn } from '@/utils/cn';

interface RemoteImageProps {
  image: FeaturedImage | null | undefined;
  altFallback: string;
  className?: string;
  imgClassName?: string;
}

/** Renders a backend featured image URL, or a neutral placeholder when missing/broken. */
export function RemoteImage({ image, altFallback, className, imgClassName }: RemoteImageProps) {
  const [failed, setFailed] = useState(false);
  const src = image?.url?.trim();
  const trimmedAlt = image?.altText?.trim();
  const alt = trimmedAlt && trimmedAlt.length > 0 ? trimmedAlt : altFallback;

  if (!src || failed) {
    return (
      <div
        className={cn('flex items-center justify-center bg-surface-container-highest', className)}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={cn('overflow-hidden bg-surface-container-highest', className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn('h-full w-full object-cover', imgClassName)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
