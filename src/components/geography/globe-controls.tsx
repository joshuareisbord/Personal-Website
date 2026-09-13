import type { ReactElement } from 'react';

import type { GlobeControls as GlobeControlsState } from './use-globe-controls';

const controlClass =
  'flex min-h-12 min-w-12 items-center justify-center border border-rule px-3 text-base hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-default disabled:text-muted';

/** Render the existing accessible camera controls. */
export function GlobeControls({ controls }: { controls: GlobeControlsState }): ReactElement {
  const {
    rotate,
    zoom,
    reset,
    view,
    paused,
    reducedMotion,
    togglePaused,
    canOpenStreet,
    openStreet,
  } = controls;
  return (
    <div
      role="group"
      aria-label="Globe controls"
      className="flex flex-wrap gap-2 border-t border-rule pt-4"
    >
      <button
        type="button"
        className={controlClass}
        aria-label="Rotate globe left"
        onClick={() => rotate(-12, 0)}
      >
        ←
      </button>
      <button
        type="button"
        className={controlClass}
        aria-label="Rotate globe right"
        onClick={() => rotate(12, 0)}
      >
        →
      </button>
      <button
        type="button"
        className={controlClass}
        aria-label="Rotate globe up"
        onClick={() => rotate(0, 10)}
      >
        ↑
      </button>
      <button
        type="button"
        className={controlClass}
        aria-label="Rotate globe down"
        onClick={() => rotate(0, -10)}
      >
        ↓
      </button>
      <button type="button" className={controlClass} aria-label="Zoom in" onClick={() => zoom(0.1)}>
        +
      </button>
      <button
        type="button"
        className={controlClass}
        aria-label="Zoom out"
        disabled={view.zoom <= 0.8}
        onClick={() => zoom(-0.1)}
      >
        −
      </button>
      <button
        type="button"
        className={controlClass}
        disabled={reducedMotion}
        aria-label={paused || reducedMotion ? 'Resume globe animation' : 'Pause globe animation'}
        aria-pressed={paused || reducedMotion}
        onClick={togglePaused}
      >
        {paused || reducedMotion ? 'Resume' : 'Pause'}
      </button>
      <button type="button" className={controlClass} onClick={reset}>
        Reset
      </button>
      <button type="button" className={controlClass} disabled={!canOpenStreet} onClick={openStreet}>
        Street level
      </button>
    </div>
  );
}
