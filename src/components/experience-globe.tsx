import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactElement, type RefObject } from 'react';
import { mesh } from 'topojson-client';
import type { Objects, Topology } from 'topojson-specification';
import type { MultiLineString } from 'geojson';

import type { Profile } from '../lib/profile';
import { formatExperienceDate } from '../lib/dates';
import { buildWorkJourney, interpolateJourneyLeg, type Coordinates, type WorkJourney } from '../lib/work-journey';
import { StreetMapLoader } from './street-map-loader';

interface Props { experience: Profile['experience']; }
interface Boundaries { coast: MultiLineString; countries: MultiLineString; regions: MultiLineString; }
type BoundaryState = { status: 'waiting' | 'loading' | 'error' } | { status: 'ready'; data: Boundaries };
interface View { rotation: Coordinates; zoom: number; elapsed: number; }
const graticule = geoGraticule10();
const controlClass = 'flex min-h-12 min-w-12 items-center justify-center border border-rule px-3 text-base hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-default disabled:text-muted';

function useBoundaries(container: RefObject<HTMLDivElement | null>, attempt: number): BoundaryState {
  const [nearby, setNearby] = useState(false);
  const [state, setState] = useState<BoundaryState>({ status: 'waiting' });
  useEffect(() => {
    if (!container.current) return;
    if (!('IntersectionObserver' in window)) { setNearby(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setNearby(true); observer.disconnect(); }
    }, { rootMargin: '250px' });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [container]);
  useEffect(() => {
    if (!nearby) return;
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    setState({ status: 'loading' });
    void (async () => {
      try {
        const response = await fetch('/geography/boundaries.topo.json', { signal: controller.signal });
        if (!response.ok) throw new Error(`Geography request failed: ${response.status}`);
        const data = await response.json() as Topology<Objects<Record<string, unknown>>>;
        if (data.type !== 'Topology' || !Array.isArray(data.arcs) || !data.objects?.countries || !data.objects.admin1) {
          throw new Error('Geography is missing its country or regional boundaries.');
        }
        const boundaries = {
          coast: mesh(data, data.objects.countries, (a, b) => a === b),
          countries: mesh(data, data.objects.countries, (a, b) => a !== b),
          regions: mesh(data, data.objects.admin1),
        };
        if (!disposed) setState({ status: 'ready', data: boundaries });
      } catch {
        if (!disposed) setState({ status: 'error' });
      } finally { window.clearTimeout(timeout); }
    })();
    return () => { disposed = true; controller.abort(); window.clearTimeout(timeout); };
  }, [nearby, attempt]);
  return state;
}

function pose(coordinates: Coordinates | null | undefined): Coordinates {
  return coordinates ? [-coordinates[0], -coordinates[1]] : [20, -20];
}

function GlobeCanvas({ journey, boundaries, selected, onSelect }: {
  journey: WorkJourney;
  boundaries: Boundaries | null;
  selected: number | undefined;
  onSelect: (index: number) => void;
}): ReactElement {
  const drawing = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; rotation: Coordinates; moved: boolean; touch: boolean } | null>(null);
  const ignoreClick = useRef(false);
  const previousSelection = useRef(selected);
  const [view, setView] = useState<View>(() => ({ rotation: pose(journey.stops.find((stop) => stop.index === selected)?.coordinates), zoom: 1, elapsed: 0 }));
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [details, setDetails] = useState<{ center: Coordinates; zoom: number } | null>(null);
  const wasDetailed = useRef(false);
  useEffect(() => {
    if (!details && wasDetailed.current) drawing.current?.focus({ preventScroll: true });
    wasDetailed.current = Boolean(details);
  }, [details]);
  const id = useId();
  const instructionsId = `${id}-instructions`;
  useEffect(() => {
    if (previousSelection.current === selected) return;
    previousSelection.current = selected;
    const coordinates = journey.stops.find((stop) => stop.index === selected)?.coordinates;
    if (coordinates) setView((current) => ({ ...current, rotation: pose(coordinates) }));
    setPaused(true);
  }, [selected, journey]);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const synchronize = (): void => setReducedMotion(preference.matches);
    synchronize();
    preference.addEventListener('change', synchronize);
    return () => preference.removeEventListener('change', synchronize);
  }, []);
  useEffect(() => {
    const container = drawing.current;
    if (!container) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let previousTime: number | undefined;
    let visible = false;
    const update = (timestamp: number): void => {
      frame = 0;
      if (!visible || document.hidden || preference.matches || paused || dragging) return;
      if (previousTime === undefined) previousTime = timestamp;
      const seconds = Math.min((timestamp - previousTime) / 1000, 0.1);
      // Limit projection work to 25 frames/sec without changing the speed of motion.
      if (seconds >= 0.04) {
        previousTime = timestamp;
        setView((current) => ({ ...current, rotation: [(current.rotation[0] + seconds * 1.5) % 360, current.rotation[1]], elapsed: current.elapsed + seconds }));
      }
      frame = window.requestAnimationFrame(update);
    };
    const synchronize = (): void => {
      const bounds = container.getBoundingClientRect();
      visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
      if (visible && !document.hidden && !preference.matches && !paused && !dragging) {
        if (!frame) frame = window.requestAnimationFrame(update);
      } else { window.cancelAnimationFrame(frame); frame = 0; previousTime = undefined; }
    };
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(synchronize) : null;
    observer?.observe(container);
    window.addEventListener('scroll', synchronize, { passive: true });
    window.addEventListener('resize', synchronize, { passive: true });
    document.addEventListener('visibilitychange', synchronize);
    preference.addEventListener('change', synchronize);
    synchronize();
    return () => {
      window.cancelAnimationFrame(frame); observer?.disconnect();
      window.removeEventListener('scroll', synchronize); window.removeEventListener('resize', synchronize);
      document.removeEventListener('visibilitychange', synchronize); preference.removeEventListener('change', synchronize);
    };
  }, [paused, dragging]);
  const projection = useMemo(() => geoOrthographic().translate([250, 250]).scale(215 * view.zoom)
    .rotate([view.rotation[0], view.rotation[1], 0]).clipAngle(90).precision(0.5), [view.rotation, view.zoom]);
  const path = useMemo(() => geoPath(projection), [projection]);
  const routes = useMemo(() => journey.legs.map((leg) => ({ type: 'LineString' as const,
    coordinates: Array.from({ length: 49 }, (_, index) => interpolateJourneyLeg(leg, index / 48)) })), [journey]);
  const center: Coordinates = [-view.rotation[0], -view.rotation[1]];
  const isVisible = (coordinates: Coordinates): boolean => geoDistance(center, coordinates) < Math.PI / 2 - 0.01;
  const rotate = (horizontal: number, vertical: number): void => {
    setPaused(true);
    setView((current) => ({ ...current, rotation: [(current.rotation[0] + horizontal) % 360, Math.max(-85, Math.min(85, current.rotation[1] + vertical))] }));
  };
  const zoom = (delta: number): void => {
    setPaused(true);
    if (delta > 0 && view.zoom >= 1.6) { setDetails({ center, zoom: 4 }); return; }
    setView((current) => ({ ...current, zoom: Math.max(0.8, Math.min(1.6, Math.round((current.zoom + delta) * 10) / 10)) }));
  };
  const reset = (): void => {
    setView({ rotation: pose(journey.stops.find((stop) => stop.index === selected)?.coordinates), zoom: 1, elapsed: 0 });
    setPaused(true);
  };
  const handleKey = (event: KeyboardEvent<SVGSVGElement>): void => {
    if (event.target !== event.currentTarget) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => rotate(-12, 0), ArrowRight: () => rotate(12, 0),
      ArrowUp: () => rotate(0, 10), ArrowDown: () => rotate(0, -10),
      '+': () => zoom(0.1), '=': () => zoom(0.1), '-': () => zoom(-0.1),
      Home: reset, ' ': () => setPaused((value) => !value),
    };
    const action = actions[event.key];
    if (action) { event.preventDefault(); action(); }
  };
  const handlePointerDown = (event: PointerEvent<SVGSVGElement>): void => {
    ignoreClick.current = false;
    if (event.button !== 0) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, rotation: view.rotation, moved: false, touch: event.pointerType === 'touch' };
    setPaused(true); setDragging(true);
  };
  const handlePointerMove = (event: PointerEvent<SVGSVGElement>): void => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 4) return;
    if (start.touch && !start.moved && Math.abs(dy) >= Math.abs(dx)) return;
    start.moved = true; ignoreClick.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const sensitivity = 180 / Math.max(200, event.currentTarget.getBoundingClientRect().width) / view.zoom;
    setView((current) => ({ ...current, rotation: [(start.rotation[0] + dx * sensitivity) % 360, Math.max(-85, Math.min(85, start.rotation[1] - (start.touch ? 0 : dy) * sensitivity))] }));
  };
  const endDrag = (event: PointerEvent<SVGSVGElement>): void => {
    drag.current = null; setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const activeLeg = journey.legs.length ? Math.floor(view.elapsed / 4) % journey.legs.length : -1;
  const leg = journey.legs[activeLeg];
  const particle = leg ? interpolateJourneyLeg(leg, (view.elapsed % 4) / 4) : null;
  const particlePoint = particle && isVisible(particle) ? projection(particle) : null;
  if (details) return <StreetMapLoader journey={journey} selected={selected} initialCenter={details.center} initialZoom={details.zoom} onSelect={onSelect}
    onBack={(coordinates) => {
      setView((current) => ({ ...current, rotation: pose(coordinates), zoom: 1.6 }));
      setPaused(true); setDetails(null);
    }} />;
  return <div>
    <svg ref={drawing} viewBox="0 0 500 500" role="group" aria-label="Interactive work-history globe" aria-describedby={instructionsId}
      tabIndex={0} onKeyDown={handleKey} onFocus={() => setPaused(true)}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
      onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
      className="aspect-square w-full touch-pan-y cursor-grab overflow-hidden text-chalk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:cursor-grabbing">
      <defs><pattern id={`${id}-grain`} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.6" fill="currentColor" /></pattern></defs>
      <path d={path({ type: 'Sphere' }) ?? ''} className="fill-night" stroke="currentColor" strokeWidth="0.8" />
      <path d={path({ type: 'Sphere' }) ?? ''} fill={`url(#${id}-grain)`} opacity="0.1" />
      <g fill="none" stroke="currentColor" strokeLinejoin="round">
        <path d={path(graticule) ?? ''} strokeWidth="0.6" opacity="0.24" />
        {boundaries && <>
          <path d={path(boundaries.regions) ?? ''} strokeWidth="0.6" opacity="0.45" />
          <path d={path(boundaries.countries) ?? ''} strokeWidth="0.65" opacity="0.6" />
          <path d={path(boundaries.coast) ?? ''} strokeWidth="0.85" opacity="0.9" />
        </>}
        {routes.map((route, index) => <path key={index} d={path(route) ?? ''} strokeWidth="1.6" strokeDasharray="3 5" opacity="0.9" />)}
      </g>
      {particlePoint && <circle cx={particlePoint[0]} cy={particlePoint[1]} r="3.5" fill="currentColor" pointerEvents="none" />}
      {journey.markers.filter((marker) => isVisible(marker.coordinates)).map((marker) => {
        const point = projection(marker.coordinates);
        if (!point) return null;
        const isSelected = marker.stops.some((stop) => stop.index === selected);
        const selectMarker = (): void => {
          const current = marker.stops.findIndex((stop) => stop.index === selected);
          onSelect(marker.stops[(current + 1) % marker.stops.length]!.index);
        };
        return <g key={marker.key} role="button" tabIndex={0} aria-pressed={isSelected}
          aria-label={`${marker.stops.map((stop) => `${stop.role.title} at ${stop.role.company}`).join('; ')}. Select location.`}
          transform={`translate(${point[0]} ${point[1]})`} className="cursor-pointer focus-visible:outline-2 focus-visible:outline-chalk"
          onClick={() => { if (!ignoreClick.current) selectMarker(); }}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectMarker(); } }}>
          <circle r="24" fill="transparent" />
          <circle r={isSelected ? 10 : 7} className="fill-night" stroke="currentColor" strokeWidth={isSelected ? 2 : 1} />
          <circle r="2.5" fill="currentColor" />
          {marker.stops.length > 1 && <text x="13" y="-10" fill="currentColor" fontSize="14" className="font-mono">{marker.stops.length}</text>}
        </g>;
      })}
      <path d="M15 35V15h20M465 15h20v20M15 465v20h20M465 485h20v-20" className="stroke-muted" fill="none" strokeWidth="0.8" />
    </svg>
    <div role="group" aria-label="Globe controls" className="flex flex-wrap gap-2 border-t border-rule pt-4">
      <button type="button" className={controlClass} aria-label="Rotate globe left" onClick={() => rotate(-12, 0)}>←</button>
      <button type="button" className={controlClass} aria-label="Rotate globe right" onClick={() => rotate(12, 0)}>→</button>
      <button type="button" className={controlClass} aria-label="Rotate globe up" onClick={() => rotate(0, 10)}>↑</button>
      <button type="button" className={controlClass} aria-label="Rotate globe down" onClick={() => rotate(0, -10)}>↓</button>
      <button type="button" className={controlClass} aria-label="Zoom in" onClick={() => zoom(0.1)}>+</button>
      <button type="button" className={controlClass} aria-label="Zoom out" disabled={view.zoom <= 0.8} onClick={() => zoom(-0.1)}>−</button>
      <button type="button" className={controlClass} disabled={reducedMotion} aria-label={paused || reducedMotion ? 'Resume globe animation' : 'Pause globe animation'} aria-pressed={paused || reducedMotion} onClick={() => setPaused((value) => !value)}>{paused || reducedMotion ? 'Resume' : 'Pause'}</button>
      <button type="button" className={controlClass} onClick={reset}>Reset</button>
      <button type="button" className={controlClass} disabled={!journey.stops.find((stop) => stop.index === selected)?.coordinates}
        onClick={() => {
          const coordinates = journey.stops.find((stop) => stop.index === selected)?.coordinates;
          if (coordinates) { setPaused(true); setDetails({ center: coordinates, zoom: 16 }); }
        }}>Street level</button>
    </div>
    <p className="mt-3 text-base leading-relaxed text-muted">Drag to rotate · Keep zooming in for streets, or select a role and choose Street level.</p>
    <p id={instructionsId} className="sr-only">Focus the globe to rotate with arrow keys, zoom with + and −, pause with Space, and reset with Home. On touch screens, drag horizontally to rotate or vertically to scroll the page. Rotation and zoom buttons are also available below.</p>
    {reducedMotion && <p className="mt-2 text-base text-muted">Automatic motion is off to match your reduced-motion setting.</p>}
  </div>;
}

/** Explore saved work locations and their chronological connections without inferring missing places. */
export function ExperienceGlobe({ experience }: Props): ReactElement {
  const container = useRef<HTMLDivElement>(null);
  const journey = useMemo(() => buildWorkJourney(experience), [experience]);
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [attempt, setAttempt] = useState(0);
  const boundaries = useBoundaries(container, attempt);
  const selected = journey.stops.find((stop) => stop.index === selectedIndex) ?? journey.stops.find((stop) => stop.coordinates) ?? journey.stops[0];
  const id = useId();
  return <div ref={container} className="w-full min-w-0 max-w-[31.25rem] border border-rule bg-paper p-4 text-ink sm:p-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-lg font-medium">Work, around the world</p>
      <p className="font-mono text-xs text-muted">{journey.markers.length} {journey.markers.length === 1 ? 'location' : 'locations'}</p>
    </div>
    <GlobeCanvas journey={journey} boundaries={boundaries.status === 'ready' ? boundaries.data : null} selected={selected?.index} onSelect={setSelectedIndex} />
    <div className="mt-4 text-base leading-relaxed" aria-live="polite">
      {boundaries.status === 'error' ? <p>Map couldn’t load. <button type="button" onClick={() => setAttempt((value) => value + 1)} className="min-h-12 underline underline-offset-4">Retry map</button></p>
        : boundaries.status === 'loading' ? <p className="text-muted">Loading map…</p> : null}
    </div>
    {journey.legs.length > 0 && <p className="mt-4 text-base leading-relaxed text-muted">Earlier roles → recent roles</p>}
    {journey.stops.length > 0 ? <>
      <label htmlFor={`${id}-role`} className="mt-5 block text-base font-medium">Explore a role</label>
      <select id={`${id}-role`} value={selected?.index ?? ''} onChange={(event) => setSelectedIndex(Number(event.target.value))}
        className="mt-2 min-h-12 w-full min-w-0 border border-ink bg-paper px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
        {journey.stops.map((stop) => <option key={stop.index} value={stop.index}>{formatExperienceDate(stop.role.startDate)} · {stop.role.title} · {stop.role.company}</option>)}
      </select>
      {selected && <div className="mt-4 border-t border-rule pt-4" aria-live="polite" aria-atomic="true">
        <p className="text-lg font-medium break-words">{selected.role.title}</p>
        <p className="mt-1 text-base break-words">{selected.role.company}</p>
        <p className="mt-2 text-base text-muted">{formatExperienceDate(selected.role.startDate)} — {selected.role.endDate ? formatExperienceDate(selected.role.endDate) : 'Present'}</p>
        <p className="mt-1 text-base break-words text-muted">{selected.role.location || (selected.role.place ? [selected.role.place.city, selected.role.place.regionCode, selected.role.place.countryCode].filter(Boolean).join(', ') : '')}</p>
        {!selected.coordinates && <p className="mt-1 text-base text-muted">No map location</p>}
      </div>}
    </> : <p className="mt-4 text-base text-muted">Work locations will appear here.</p>}
  </div>;
}
