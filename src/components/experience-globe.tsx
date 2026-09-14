import { useId, useMemo, useRef, useState, type ReactElement } from 'react';

import type { Profile } from '../lib/profile';
import { formatExperienceDate } from '../lib/dates';
import { buildWorkJourney } from '../lib/work-journey';
import { GlobeCanvas } from './geography/globe-canvas';
import { useBoundaries } from './geography/use-boundaries';

interface Props {
  experience: Profile['experience'];
}

/** Explore saved work locations and their chronological connections without inferring missing places. */
export function ExperienceGlobe({ experience }: Props): ReactElement {
  const container = useRef<HTMLDivElement>(null);
  const journey = useMemo(() => buildWorkJourney(experience), [experience]);
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [attempt, setAttempt] = useState(0);
  const boundaries = useBoundaries(container, attempt);
  const selected =
    journey.stops.find((stop) => stop.index === selectedIndex) ??
    journey.stops.find((stop) => stop.coordinates) ??
    journey.stops[0];
  const id = useId();
  return (
    <div
      ref={container}
      className="w-full min-w-0 max-w-[31.25rem] border border-rule bg-paper p-4 text-ink sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-lg font-medium">Work, around the world</p>
        <p className="font-mono text-xs text-muted">
          {journey.markers.length} {journey.markers.length === 1 ? 'location' : 'locations'}
        </p>
      </div>
      <GlobeCanvas
        journey={journey}
        boundaries={boundaries.status === 'ready' ? boundaries.data : null}
        selected={selected?.index}
        onSelect={setSelectedIndex}
      />
      <div className="mt-4 text-base leading-relaxed" aria-live="polite">
        {boundaries.status === 'error' ? (
          <p>
            Map couldn’t load.{' '}
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="min-h-12 underline underline-offset-4"
            >
              Retry map
            </button>
          </p>
        ) : boundaries.status === 'loading' ? (
          <p className="text-muted">Loading map…</p>
        ) : null}
      </div>
      {journey.legs.length > 0 && (
        <p className="mt-4 text-base leading-relaxed text-muted">Earlier roles → recent roles</p>
      )}
      {journey.stops.length > 0 ? (
        <>
          <label htmlFor={`${id}-role`} className="mt-5 block text-base font-medium">
            Explore a role
          </label>
          <select
            id={`${id}-role`}
            value={selected?.index ?? ''}
            onChange={(event) => setSelectedIndex(Number(event.target.value))}
            className="mt-2 min-h-12 w-full min-w-0 border border-ink bg-paper px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {journey.stops.map((stop) => (
              <option key={stop.index} value={stop.index}>
                {formatExperienceDate(stop.role.startDate)} · {stop.role.title} ·{' '}
                {stop.role.company}
              </option>
            ))}
          </select>
          {selected && (
            <div className="mt-4 border-t border-rule pt-4" aria-live="polite" aria-atomic="true">
              <p className="text-lg font-medium break-words">{selected.role.title}</p>
              <p className="mt-1 text-base break-words">{selected.role.company}</p>
              <p className="mt-2 text-base text-muted">
                {formatExperienceDate(selected.role.startDate)} —{' '}
                {selected.role.endDate ? formatExperienceDate(selected.role.endDate) : 'Present'}
              </p>
              <p className="mt-1 text-base break-words text-muted">
                {selected.role.location ||
                  (selected.role.place
                    ? [
                        selected.role.place.city,
                        selected.role.place.regionCode,
                        selected.role.place.countryCode,
                      ]
                        .filter(Boolean)
                        .join(', ')
                    : '')}
              </p>
              {!selected.coordinates && (
                <p className="mt-1 text-base text-muted">No map location</p>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 text-base text-muted">Work locations will appear here.</p>
      )}
    </div>
  );
}
