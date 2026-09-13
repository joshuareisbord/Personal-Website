export const PHOTO_INPUT_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const PHOTO_ACCEPT = PHOTO_INPUT_TYPES.join(',');
export const PHOTO_OUTPUT_TYPE = 'image/jpeg';
export const MAX_PHOTO_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTO_OUTPUT_BYTES = 1024 * 1024;
export const MAX_PHOTO_PIXELS = 40_000_000;
export const MAX_PHOTO_INPUT_DIMENSION = 32_768;
export const MAX_PHOTO_DIMENSION = 1200;
export const PHOTO_JPEG_QUALITY = 0.85;

type PhotoMetadata = Pick<Blob, 'type' | 'size'>;

/** Check source MIME type and bytes before asking the browser to decode. */
export function validatePhotoInput(file: PhotoMetadata): void {
  if (!PHOTO_INPUT_TYPES.some((type) => type === file.type))
    throw new Error('Choose a PNG, JPEG, or WebP image.');
  if (!Number.isSafeInteger(file.size) || file.size <= 0)
    throw new Error('Choose a non-empty image file.');
  if (file.size > MAX_PHOTO_INPUT_BYTES) throw new Error('Choose an image no larger than 10 MiB.');
}

/** Check the prepared upload contract; MIME and size checks do not prove image contents. */
export function validatePreparedPhoto(file: PhotoMetadata): void {
  if (file.type !== PHOTO_OUTPUT_TYPE) throw new Error('The prepared photo must be a JPEG image.');
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > MAX_PHOTO_OUTPUT_BYTES) {
    throw new Error('The prepared photo must be non-empty and no larger than 1 MiB.');
  }
}

/** Validate decoded dimensions and fit the image within 1200 pixels without upscaling. */
export function getPhotoDimensions(
  width: number,
  height: number,
): { width: number; height: number } {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_PHOTO_INPUT_DIMENSION ||
    height > MAX_PHOTO_INPUT_DIMENSION ||
    width * height > MAX_PHOTO_PIXELS
  ) {
    throw new Error('Choose an image up to 40 megapixels and 32,768 pixels per side.');
  }
  const scale = Math.min(1, MAX_PHOTO_DIMENSION / width, MAX_PHOTO_DIMENSION / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function encodeJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not prepare this photo. Try another image.'));
      },
      PHOTO_OUTPUT_TYPE,
      PHOTO_JPEG_QUALITY,
    );
  });
}

/** Decode and redraw a source photo as a metadata-free JPEG for a later owner save. */
export async function preparePhoto(file: File): Promise<Blob> {
  validatePhotoInput(file);
  let decoded: ImageBitmap;
  try {
    decoded = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Could not decode this image. Choose a valid PNG, JPEG, or WebP photo.');
  }
  let canvas: HTMLCanvasElement | undefined;
  try {
    let { width, height } = getPhotoDimensions(decoded.width, decoded.height);
    canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error('Your browser could not prepare this photo. Try another browser.');
    // Keep JPEG quality consistent; reduce dimensions further only if the byte cap requires it.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      canvas.width = width;
      canvas.height = height;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(decoded, 0, 0, width, height);
      const output = await encodeJpeg(canvas);
      if (output.size <= MAX_PHOTO_OUTPUT_BYTES) {
        validatePreparedPhoto(output);
        return output;
      }
      width = Math.max(1, Math.floor(width * 0.8));
      height = Math.max(1, Math.floor(height * 0.8));
    }
    throw new Error('Could not reduce this photo to 1 MiB. Choose a smaller image.');
  } finally {
    decoded.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
