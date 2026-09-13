import { useId, type ReactElement } from 'react';

import type { Coordinates, WorkJourney } from '../lib/work-journey';
import { useStreetMap } from './geography/use-street-map';

export interface StreetMapProps {
  journey: WorkJourney;
  selected: number | undefined;
  initialCenter: Coordinates;
  initialZoom: number;
  onSelect: (index: number) => void;
  onBack: (center: Coordinates) => void;
}

/** Explore saved offices or city centers using an on-demand street map within the globe panel. */
export default function StreetMap(props: StreetMapProps): ReactElement {
  const { host, status, ready, zoom, zoomIn, zoomOut, back, retry } = useStreetMap(props);
  const instructionsId = useId();
  return (
    <div className="street-map">
      <div
        ref={host}
        role="region"
        aria-label="Interactive street map of work locations"
        aria-describedby={instructionsId}
        tabIndex={0}
        className="street-map-surface aspect-square w-full border border-rule"
        data-motion="paused"
      />
      <div
        role="group"
        aria-label="Street map controls"
        className="mt-4 flex flex-wrap gap-2 border-t border-rule pt-4"
      >
        <button
          type="button"
          className="street-map-control min-h-12 min-w-12 border border-ink px-3"
          aria-label="Zoom in"
          disabled={!ready || zoom >= 19}
          onClick={zoomIn}
        >
          +
        </button>
        <button
          type="button"
          className="street-map-control min-h-12 min-w-12 border border-ink px-3"
          aria-label="Zoom out"
          disabled={!ready}
          onClick={zoomOut}
        >
          −
        </button>
        <button
          type="button"
          className="street-map-control min-h-12 border border-ink px-3"
          onClick={back}
        >
          Back to globe
        </button>
      </div>
      <p className="mt-3 text-base" aria-live="polite" aria-atomic="true">
        {status === 'loading' ? (
          'Loading street map…'
        ) : status === 'error' ? (
          <>
            Street map couldn’t load. Check your connection and try again.{' '}
            <button type="button" className="min-h-12 underline underline-offset-4" onClick={retry}>
              Retry map
            </button>
          </>
        ) : null}
      </p>
      <p id={instructionsId} className="mt-3 text-base leading-relaxed text-muted">
        Drag to pan · Use +/− or pinch to zoom. Use two fingers to move the map on touch screens.
        <span className="sr-only">
          {' '}
          Arrow keys pan when the map is focused. Double-click also zooms. One finger scrolls the
          page. Zoom out to return to the globe.
        </span>
      </p>
      <p className="mt-3 text-base leading-relaxed text-muted">
        Points mark offices where provided, or city centers. Dashed lines show career moves between
        locations.
      </p>
      <p className="mt-3 text-base">
        ©{' '}
        <a className="underline underline-offset-4" href="https://www.openstreetmap.org/copyright">
          OpenStreetMap
        </a>{' '}
        contributors
      </p>
    </div>
  );
}
