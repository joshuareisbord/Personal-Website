import type { CSSProperties } from 'react';

import { z } from 'zod';

const boundsEpsilon = 1e-7;

/** A selected rectangle in source-image percentages, allowing only floating-point boundary noise. */
export const photoCropSchema = z
  .object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    width: z.number().positive().max(100),
    height: z.number().positive().max(100),
  })
  .strict()
  .refine(
    (crop) =>
      crop.x + crop.width <= 100 + boundsEpsilon && crop.y + crop.height <= 100 + boundsEpsilon,
    { message: 'Photo crop must stay inside the image.' },
  );

/** A saved photo crop, independent of the source image's pixel dimensions. */
export type PhotoCrop = z.infer<typeof photoCropSchema>;

/** Scale and offset the source image so its selected rectangle fills the photo frame. */
export function photoCropStyle(crop: PhotoCrop): CSSProperties {
  return {
    width: `${10000 / crop.width}%`,
    height: `${10000 / crop.height}%`,
    left: `${(-100 * crop.x) / crop.width}%`,
    top: `${(-100 * crop.y) / crop.height}%`,
    maxWidth: 'none',
  };
}
