import { geoGraticule10 } from 'd3-geo';
import { useId, type ReactElement } from 'react';

import type { WorkJourney } from '../../lib/work-journey';
import { StreetMapLoader } from '../street-map-loader';
import { GlobeControls } from './globe-controls';
import type { Boundaries } from './use-boundaries';
import { useGlobeControls } from './use-globe-controls';
import { useGlobeProjection } from './use-globe-projection';

const graticule = geoGraticule10();

/** Draw the globe and location markers, or its on-demand street view. */
export function GlobeCanvas({
  journey,
  boundaries,
  selected,
  onSelect,
}: {
  journey: WorkJourney;
  boundaries: Boundaries | null;
  selected: number | undefined;
  onSelect: (index: number) => void;
}): ReactElement {
  const controls = useGlobeControls(journey, selected);
  const {
    drawing,
    ignoreClick,
    view,
    reducedMotion,
    details,
    handleKey,
    handlePointerDown,
    handlePointerMove,
    endDrag,
  } = controls;
  const { projection, path, routes, particlePoint, isVisible } = useGlobeProjection(journey, view);
  const id = useId();
  const instructionsId = `${id}-instructions`;
  if (details)
    return (
      <StreetMapLoader
        journey={journey}
        selected={selected}
        initialCenter={details.center}
        initialZoom={details.zoom}
        onSelect={onSelect}
        onBack={controls.returnToGlobe}
      />
    );
  return (
    <div>
      <svg
        ref={drawing}
        viewBox="0 0 500 500"
        role="group"
        aria-label="Interactive work-history globe"
        aria-describedby={instructionsId}
        tabIndex={0}
        onKeyDown={handleKey}
        onFocus={controls.pause}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={controls.cancelDrag}
        className="aspect-square w-full touch-pan-y cursor-grab overflow-hidden text-chalk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:cursor-grabbing"
      >
        <defs>
          <pattern id={`${id}-grain`} width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="currentColor" />
          </pattern>
        </defs>
        <path
          d={path({ type: 'Sphere' }) ?? ''}
          className="fill-night"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <path d={path({ type: 'Sphere' }) ?? ''} fill={`url(#${id}-grain)`} opacity="0.1" />
        <g fill="none" stroke="currentColor" strokeLinejoin="round">
          <path d={path(graticule) ?? ''} strokeWidth="0.6" opacity="0.24" />
          {boundaries && (
            <>
              <path d={path(boundaries.regions) ?? ''} strokeWidth="0.6" opacity="0.45" />
              <path d={path(boundaries.countries) ?? ''} strokeWidth="0.65" opacity="0.6" />
              <path d={path(boundaries.coast) ?? ''} strokeWidth="0.85" opacity="0.9" />
            </>
          )}
          {routes.map((route, index) => (
            <path
              key={index}
              d={path(route) ?? ''}
              strokeWidth="1.6"
              strokeDasharray="3 5"
              opacity="0.9"
            />
          ))}
        </g>
        {particlePoint && (
          <circle
            cx={particlePoint[0]}
            cy={particlePoint[1]}
            r="3.5"
            fill="currentColor"
            pointerEvents="none"
          />
        )}
        {journey.markers
          .filter((marker) => isVisible(marker.coordinates))
          .map((marker) => {
            const point = projection(marker.coordinates);
            if (!point) return null;
            const isSelected = marker.stops.some((stop) => stop.index === selected);
            const selectMarker = (): void => {
              const current = marker.stops.findIndex((stop) => stop.index === selected);
              onSelect(marker.stops[(current + 1) % marker.stops.length]!.index);
            };
            return (
              <g
                key={marker.key}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${marker.stops.map((stop) => `${stop.role.title} at ${stop.role.company}`).join('; ')}. Select location.`}
                transform={`translate(${point[0]} ${point[1]})`}
                className="cursor-pointer focus-visible:outline-2 focus-visible:outline-chalk"
                onClick={() => {
                  if (!ignoreClick.current) selectMarker();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectMarker();
                  }
                }}
              >
                <circle r="24" fill="transparent" />
                <circle
                  r={isSelected ? 10 : 7}
                  className="fill-night"
                  stroke="currentColor"
                  strokeWidth={isSelected ? 2 : 1}
                />
                <circle r="2.5" fill="currentColor" />
                {marker.stops.length > 1 && (
                  <text x="13" y="-10" fill="currentColor" fontSize="14" className="font-mono">
                    {marker.stops.length}
                  </text>
                )}
              </g>
            );
          })}
        <path
          d="M15 35V15h20M465 15h20v20M15 465v20h20M465 485h20v-20"
          className="stroke-muted"
          fill="none"
          strokeWidth="0.8"
        />
      </svg>
      <GlobeControls controls={controls} />
      <p className="mt-3 text-base leading-relaxed text-muted">
        Drag to rotate · Keep zooming in for streets, or select a role and choose Street level.
      </p>
      <p id={instructionsId} className="sr-only">
        Focus the globe to rotate with arrow keys, zoom with + and −, pause with Space, and reset
        with Home. On touch screens, drag horizontally to rotate or vertically to scroll the page.
        Rotation and zoom buttons are also available below.
      </p>
      {reducedMotion && (
        <p className="mt-2 text-base text-muted">
          Automatic motion is off to match your reduced-motion setting.
        </p>
      )}
    </div>
  );
}
