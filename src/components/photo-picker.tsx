import { useId, type ReactElement } from 'react';

import { PHOTO_ACCEPT } from '../lib/photo-upload';
import type { PhotoCrop } from '../lib/photo-crop';
import { buttonClass, controlClass } from './editor-styles';
import { PhotoCropper } from './photo-cropper';
import { ProfilePhoto } from './profile-photo';
import { usePhotoSelection } from './editor/use-photo-selection';

export interface PhotoPickerProps {
  path: string;
  file: Blob | null;
  alt: string;
  crop?: PhotoCrop | undefined;
  onCropChange?: (crop: PhotoCrop | undefined) => void;
  onCroppingChange?: (cropping: boolean) => void;
  onPathChange: (value: string) => void;
  onFileChange: (file: Blob | null) => void;
  onPreparingChange?: (preparing: boolean) => void;
}

/** Keep a prepared upload separate from its published path; the parent clears file after saving. */
export function PhotoPicker(props: PhotoPickerProps): ReactElement {
  const { path, file, alt, crop, onCropChange, onPathChange, onFileChange } = props;
  const id = useId();
  const {
    input,
    cropButton,
    preparing,
    error,
    failedPreview,
    cropping,
    source,
    setFailedPreview,
    openCrop,
    closeCrop,
    cancel,
    select,
  } = usePhotoSelection(props);
  return (
    <div className="min-w-0 space-y-4">
      <div>
        <label htmlFor={`${id}-upload`} className="text-base font-medium text-ink">
          Upload photo
        </label>
        <input
          ref={input}
          id={`${id}-upload`}
          type="file"
          accept={PHOTO_ACCEPT}
          aria-describedby={`${id}-help ${id}-status${error ? ` ${id}-error` : ''}`}
          aria-invalid={Boolean(error)}
          className={`${controlClass} file:mr-3 file:min-h-12 file:cursor-pointer file:border file:border-ink file:bg-paper file:px-4 file:py-2 file:font-mono file:text-xs file:text-ink hover:file:bg-ink hover:file:text-paper`}
          onChange={(event) => {
            const selected = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (selected) void select(selected);
          }}
        />
        <p id={`${id}-help`} className="mt-2 text-sm leading-relaxed text-muted">
          PNG, JPEG, or WebP, up to 10 MiB and 40 megapixels. Photos are resized to fit 1200 × 1200
          and saved as JPEG. Transparent areas become white.
        </p>
      </div>
      <div>
        <label htmlFor={`${id}-path`} className="text-base font-medium text-ink">
          Or use a photo link
        </label>
        <input
          id={`${id}-path`}
          type="text"
          value={path}
          className={controlClass}
          aria-describedby={`${id}-link-help`}
          onChange={(event) => {
            cancel();
            onFileChange(null);
            onPathChange(event.currentTarget.value);
          }}
        />
        <p id={`${id}-link-help`} className="mt-2 text-sm leading-relaxed text-muted">
          Use an HTTPS image link or an existing /profile/ image. Editing this link replaces the
          pending upload.
        </p>
      </div>
      <p id={`${id}-status`} role="status" className="text-sm leading-relaxed text-ink">
        {preparing
          ? 'Preparing photo…'
          : file
            ? 'Photo ready. Save and publish to upload it.'
            : 'Photo changes appear on your website after saving.'}
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm leading-relaxed text-ink">
          {error}
        </p>
      )}
      {source && source !== failedPreview && !cropping && (
        <ProfilePhoto
          key={source}
          src={source}
          alt={alt || 'Selected photo preview'}
          crop={crop}
          className="w-full max-w-xs border border-rule grayscale"
          onError={() => setFailedPreview(source)}
        />
      )}
      {source && cropping && onCropChange && (
        <PhotoCropper
          key={source}
          source={source}
          initialCrop={crop}
          onApply={(value) => {
            onCropChange(value);
            closeCrop();
          }}
          onCancel={closeCrop}
        />
      )}
      {source && source === failedPreview && (
        <p role="status" className="text-sm text-ink">
          Photo preview could not load. Check the image link or choose another photo.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {source && source !== failedPreview && onCropChange && (
          <button
            ref={cropButton}
            type="button"
            className={buttonClass}
            disabled={preparing || cropping}
            onClick={openCrop}
          >
            Crop photo
          </button>
        )}
        {crop && onCropChange && !cropping && (
          <button type="button" className={buttonClass} onClick={() => onCropChange(undefined)}>
            Reset crop
          </button>
        )}
        {(file || preparing) && (
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              cancel();
              onFileChange(null);
            }}
          >
            Revert upload
          </button>
        )}
        {(path || file || preparing) && (
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              cancel();
              onFileChange(null);
              onPathChange('');
            }}
          >
            Remove photo
          </button>
        )}
      </div>
    </div>
  );
}
