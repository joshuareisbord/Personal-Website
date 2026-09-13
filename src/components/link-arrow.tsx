import { mdiArrowTopRight } from '@mdi/js';
import type { ReactElement } from 'react';

/** Keep decorative link arrows monochrome across desktop and mobile fonts. */
export function LinkArrow({ className = '' }: { className?: string }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`inline-block size-[1em] shrink-0 align-middle ${className}`}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={mdiArrowTopRight} />
    </svg>
  );
}
