import { useCallback, useEffect, useId, useRef, useState, type ReactElement } from 'react';

import { photoSource } from '../lib/photo-source';
import { PHOTO_ACCEPT, preparePhoto } from '../lib/photo-upload';
import { buttonClass, controlClass } from './editor-styles';

export interface PhotoPickerProps {
  path: string;
  file: Blob | null;
  alt: string;
  onPathChange: (value: string) => void;
  onFileChange: (file: Blob | null) => void;
  onPreparingChange?: (preparing: boolean) => void;
}

function previewPath(path: string): string {
  const value = path.trim();
  if (/^\/profile\/[A-Za-z0-9][A-Za-z0-9_-]*\.(?:webp|png|jpg)$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? value : '';
  } catch { return ''; }
}

/** Keep a prepared upload separate from its published path; the parent clears file after saving. */
export function PhotoPicker({ path, file, alt, onPathChange, onFileChange, onPreparingChange }: PhotoPickerProps): ReactElement {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const preparingRef = useRef(false);
  const preparingCallback = useRef(onPreparingChange);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ file: Blob; url: string } | null>(null);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);

  useEffect(() => { preparingCallback.current = onPreparingChange; }, [onPreparingChange]);
  const reportPreparing = useCallback((value: boolean): void => {
    if (preparingRef.current === value) return;
    preparingRef.current = value;
    preparingCallback.current?.(value);
  }, []);

  useEffect(() => {
    request.current += 1;
    setPreparing(false);
    reportPreparing(false);
    setError('');
    if (input.current) { input.current.value = ''; input.current.setCustomValidity(''); }
    return () => { request.current += 1; reportPreparing(false); };
  }, [path, file, reportPreparing]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => { URL.revokeObjectURL(url); };
  }, [file]);

  const cancel = (): void => {
    request.current += 1;
    setPreparing(false);
    reportPreparing(false);
    setError('');
    setFailedPreview(null);
    if (input.current) { input.current.value = ''; input.current.setCustomValidity(''); }
  };
  const select = async (selected: File): Promise<void> => {
    const current = ++request.current;
    setPreparing(true);
    reportPreparing(true);
    setError('');
    input.current?.setCustomValidity('Wait for the photo to finish preparing.');
    try {
      const prepared = await preparePhoto(selected);
      if (current !== request.current) return;
      setFailedPreview(null);
      onFileChange(prepared);
    } catch (failure) {
      if (current === request.current) setError(failure instanceof Error ? failure.message : 'Could not prepare this photo. Try another image.');
    } finally {
      if (current === request.current) {
        setPreparing(false);
        reportPreparing(false);
        input.current?.setCustomValidity('');
      }
    }
  };
  const source = file ? (preview?.file === file ? preview.url : '') : photoSource(previewPath(path));

  return <div className="min-w-0 space-y-4">
    <div>
      <label htmlFor={`${id}-upload`} className="text-base font-medium text-ink">Upload photo</label>
      <input ref={input} id={`${id}-upload`} type="file" accept={PHOTO_ACCEPT}
        aria-describedby={`${id}-help ${id}-status${error ? ` ${id}-error` : ''}`} aria-invalid={Boolean(error)}
        className={`${controlClass} file:mr-3 file:min-h-12 file:cursor-pointer file:border file:border-ink file:bg-paper file:px-4 file:py-2 file:font-mono file:text-xs file:text-ink hover:file:bg-ink hover:file:text-paper`}
        onChange={(event) => {
          const selected = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (selected) void select(selected);
        }} />
      <p id={`${id}-help`} className="mt-2 text-sm leading-relaxed text-muted">PNG, JPEG, or WebP, up to 10 MiB and 40 megapixels. Photos are resized to fit 1200 × 1200 and saved as JPEG. Transparent areas become white.</p>
    </div>
    <div>
      <label htmlFor={`${id}-path`} className="text-base font-medium text-ink">Or use a photo link</label>
      <input id={`${id}-path`} type="text" value={path} className={controlClass} aria-describedby={`${id}-link-help`}
        onChange={(event) => { cancel(); onFileChange(null); onPathChange(event.currentTarget.value); }} />
      <p id={`${id}-link-help`} className="mt-2 text-sm leading-relaxed text-muted">Use an HTTPS image link or an existing /profile/ image. Editing this link replaces the pending upload.</p>
    </div>
    <p id={`${id}-status`} role="status" className="text-sm leading-relaxed text-ink">
      {preparing ? 'Preparing photo…' : file ? 'Photo ready. Save and publish to upload it.' : 'Photo changes appear on your website after saving.'}
    </p>
    {error && <p id={`${id}-error`} role="alert" className="text-sm leading-relaxed text-ink">{error}</p>}
    {source && source !== failedPreview && <img key={source} src={source} alt={alt || 'Selected photo preview'}
      className="max-h-64 w-full border border-rule object-contain" onError={() => setFailedPreview(source)} />}
    {source && source === failedPreview && <p role="status" className="text-sm text-ink">Photo preview could not load. Check the image link or choose another photo.</p>}
    <div className="flex flex-wrap gap-3">
      {(file || preparing) && <button type="button" className={buttonClass} onClick={() => { cancel(); onFileChange(null); }}>Revert upload</button>}
      {(path || file || preparing) && <button type="button" className={buttonClass} onClick={() => { cancel(); onFileChange(null); onPathChange(''); }}>Remove photo</button>}
    </div>
  </div>;
}
