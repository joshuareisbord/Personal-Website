import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { photoSource } from '../../lib/photo-source';
import { preparePhoto } from '../../lib/photo-upload';
import type { PhotoPickerProps } from '../photo-picker';

interface PhotoPreview {
  file: Blob;
  url: string;
}
interface PhotoSelection {
  input: RefObject<HTMLInputElement | null>;
  cropButton: RefObject<HTMLButtonElement | null>;
  preparing: boolean;
  error: string;
  failedPreview: string | null;
  cropping: boolean;
  source: string;
  setFailedPreview: (source: string | null) => void;
  openCrop: () => void;
  closeCrop: () => void;
  cancel: () => void;
  select: (file: File) => Promise<void>;
}

function previewPath(path: string): string {
  const value = path.trim();
  if (/^\/profile\/[A-Za-z0-9][A-Za-z0-9_-]*\.(?:webp|png|jpg)$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? value : '';
  } catch {
    return '';
  }
}

/** Prepare uploads, retire stale requests, and release temporary photo previews. */
export function usePhotoSelection({
  path,
  file,
  onFileChange,
  onPreparingChange,
  onCroppingChange,
}: PhotoPickerProps): PhotoSelection {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const preparingRef = useRef(false);
  const preparingCallback = useRef(onPreparingChange);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<PhotoPreview | null>(null);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const cropButton = useRef<HTMLButtonElement>(null);
  const croppingCallback = useRef(onCroppingChange);
  useEffect(() => {
    croppingCallback.current = onCroppingChange;
  }, [onCroppingChange]);
  const closeCrop = (): void => {
    setCropping(false);
    croppingCallback.current?.(false);
    cropButton.current?.focus();
  };

  useEffect(() => {
    preparingCallback.current = onPreparingChange;
  }, [onPreparingChange]);
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
    setCropping(false);
    croppingCallback.current?.(false);
    if (input.current) {
      input.current.value = '';
      input.current.setCustomValidity('');
    }
    return () => {
      request.current += 1;
      reportPreparing(false);
      croppingCallback.current?.(false);
    };
  }, [path, file, reportPreparing]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const cancel = (): void => {
    closeCrop();
    request.current += 1;
    setPreparing(false);
    reportPreparing(false);
    setError('');
    setFailedPreview(null);
    if (input.current) {
      input.current.value = '';
      input.current.setCustomValidity('');
    }
  };
  const select = async (selected: File): Promise<void> => {
    closeCrop();
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
      if (current === request.current)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Could not prepare this photo. Try another image.',
        );
    } finally {
      if (current === request.current) {
        setPreparing(false);
        reportPreparing(false);
        input.current?.setCustomValidity('');
      }
    }
  };
  const source = file
    ? preview?.file === file
      ? preview.url
      : ''
    : photoSource(previewPath(path));

  const openCrop = (): void => {
    setCropping(true);
    croppingCallback.current?.(true);
  };
  return {
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
  };
}
