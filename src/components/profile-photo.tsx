import type { ImgHTMLAttributes, ReactElement, ReactEventHandler } from 'react';

import { photoCropStyle, type PhotoCrop } from '../lib/photo-crop';

interface Props {
  src: string;
  alt: string;
  crop?: PhotoCrop | undefined;
  className?: string | undefined;
  onError?: ReactEventHandler<HTMLImageElement> | undefined;
  loading?: ImgHTMLAttributes<HTMLImageElement>['loading'];
}

/** Render the same portrait framing in public pages and editor previews. */
export function ProfilePhoto({
  src,
  alt,
  crop,
  className = '',
  onError,
  loading,
}: Props): ReactElement {
  return (
    <div className={`relative aspect-[4/5] w-full overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        width={416}
        height={520}
        loading={loading}
        onError={onError}
        className={crop ? 'absolute' : 'h-full w-full object-cover'}
        style={crop ? photoCropStyle(crop) : undefined}
      />
    </div>
  );
}
