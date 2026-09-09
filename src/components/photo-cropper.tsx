import { useEffect, useId, useRef, useState, type ReactElement } from 'react';
import Cropper from 'react-easy-crop';

import { photoCropSchema, type PhotoCrop } from '../lib/photo-crop';
import { buttonClass } from './editor-styles';

interface Props { source: string; initialCrop?: PhotoCrop | undefined; onApply: (crop: PhotoCrop) => void; onCancel: () => void; }

/** Adjust a reversible portrait crop without downloading or rewriting the source image. */
export function PhotoCropper({ source, initialCrop, onApply, onCancel }: Props): ReactElement {
  const id = useId();
  const section = useRef<HTMLElement>(null);
  useEffect(() => { section.current?.focus({ preventScroll: true }); }, []);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<PhotoCrop>();
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return <section ref={section} tabIndex={-1} aria-labelledby={`${id}-title`} className="space-y-4 border border-rule p-4 sm:p-5">
    <h4 id={`${id}-title`} className="text-xl font-medium">Adjust photo crop</h4>
    <p id={`${id}-hint`} className="text-sm leading-relaxed text-muted">Drag the photo to position it, then zoom to frame your portrait. You can also focus the image and use the arrow keys.</p>
    <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden bg-night">
      <Cropper image={source} crop={position} zoom={zoom} aspect={4 / 5} objectFit="cover" minZoom={1} maxZoom={3}
        onCropChange={setPosition} onZoomChange={setZoom} {...(initialCrop ? { initialCroppedAreaPercentages: initialCrop } : {})}
        onCropAreaChange={(value) => { const result = photoCropSchema.safeParse(value); setArea(result.success ? result.data : undefined); }}
        onMediaLoaded={() => setLoaded(true)}
        zoomWithScroll={false} disableAutomaticStylesInjection
        mediaProps={{ alt: 'Photo being cropped', onError: () => { setFailed(true); setArea(undefined); } }}
        cropperProps={{ 'aria-label': 'Position photo', 'aria-describedby': `${id}-hint` }}
        style={{ mediaStyle: { filter: 'grayscale(1)' } }} />
    </div>
    <div className="max-w-sm">
      <label htmlFor={`${id}-zoom`} className="flex items-center justify-between gap-4 text-base">Zoom <span className="font-mono text-xs">{zoom.toFixed(2)}×</span></label>
      <input id={`${id}-zoom`} type="range" min="1" max="3" step="0.01" value={zoom} disabled={failed || !loaded} className="min-h-12 w-full accent-ink" onChange={(event) => setZoom(Number(event.target.value))} />
    </div>
    {!loaded && !failed && <p role="status" className="text-sm">Loading photo for cropping…</p>}
    {failed && <p role="alert" className="text-sm">This photo could not load for cropping. Cancel and check the photo link or upload another image.</p>}
    <div className="flex flex-wrap gap-3">
      <button type="button" className={buttonClass} disabled={!area || failed || !loaded} onClick={() => { if (area) onApply(area); }}>Apply crop</button>
      <button type="button" className={buttonClass} disabled={failed || !loaded} onClick={() => { setPosition({ x: 0, y: 0 }); setZoom(1); }}>Reset framing</button>
      <button type="button" className={buttonClass} onClick={onCancel}>Cancel crop</button>
    </div>
    <p className="text-sm text-muted">Apply the crop, then Save and publish. Your original photo stays available for future adjustments.</p>
  </section>;
}
