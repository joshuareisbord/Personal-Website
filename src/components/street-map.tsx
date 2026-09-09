import type { Map as LeafletMap } from 'leaflet';
import { useEffect, useId, useMemo, useRef, useState, type ReactElement } from 'react';

import { buildStreetRoutes, fromMapCenter, nextMarkerIndex, toMapPosition, type MapPosition } from '../lib/street-map-data';
import type { Coordinates, WorkJourney } from '../lib/work-journey';

export interface StreetMapProps {
  journey: WorkJourney;
  selected: number | undefined;
  initialCenter: Coordinates;
  initialZoom: number;
  onSelect: (index: number) => void;
  onBack: (center: Coordinates) => void;
}

interface Runtime {
  map: LeafletMap;
  select: (recenter: boolean) => void;
}

/** Explore saved offices or city centers using an on-demand street map within the globe panel. */
export default function StreetMap({ journey, selected, initialCenter, initialZoom, onSelect, onBack }: StreetMapProps): ReactElement {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const camera = useRef({ center: initialCenter, zoom: Math.max(2, Math.min(19, initialZoom)) });
  const latest = useRef({ selected, onSelect, onBack });
  const previousSelection = useRef(selected);
  const pendingFocus = useRef(false);
  const leaving = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(camera.current.zoom);
  const routes = useMemo(() => buildStreetRoutes(journey), [journey]);
  const instructionsId = useId();

  useEffect(() => { latest.current = { selected, onSelect, onBack }; }, [selected, onSelect, onBack]);

  useEffect(() => {
    if (previousSelection.current === selected) return;
    previousSelection.current = selected;
    pendingFocus.current = true;
    if (runtime.current) { runtime.current.select(true); pendingFocus.current = false; }
  }, [selected]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let cancelled = false;
    let map: LeafletMap | undefined;
    const disposers: (() => void)[] = [];
    setStatus('loading');
    setReady(false);
    const dispose = (): void => {
      disposers.splice(0).forEach((cleanup) => cleanup());
      runtime.current = null;
      map?.remove();
      map = undefined;
    };

    const initialize = async (): Promise<void> => {
      try {
        // Keep both stylesheets and Leaflet's browser-only code out of the initial/SSR module graph.
        const [L] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css'), import('./street-map.css')]);
        if (cancelled) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        const instance = L.map(container, {
          center: toMapPosition(camera.current.center), zoom: camera.current.zoom,
          minZoom: 2, maxZoom: 19, scrollWheelZoom: false, zoomControl: false,
          attributionControl: true, keyboard: true, doubleClickZoom: true,
          touchZoom: true, bounceAtZoomLimits: false, worldCopyJump: true,
          zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
        });
        map = instance;
        disposers.push(() => {
          // Leaflet 1.9 removes touchstart on teardown, but an active pinch also owns document listeners.
          const pinch = instance.touchZoom as typeof instance.touchZoom & {
            _onTouchMove?: (event: Event) => void;
            _onTouchEnd?: (event: Event) => void;
            _animRequest?: number;
          };
          // Its public types omit Document even though Leaflet itself uses it as an event target.
          const off = L.DomEvent.off as typeof L.DomEvent.off &
            ((target: Document, events: string, handler: (event: Event) => void, context: object) => void);
          if (pinch._onTouchMove) off(document, 'touchmove', pinch._onTouchMove, pinch);
          if (pinch._onTouchEnd) off(document, 'touchend touchcancel', pinch._onTouchEnd, pinch);
          if (pinch._animRequest !== undefined) L.Util.cancelAnimFrame(pinch._animRequest);
        });
        instance.attributionControl.setPrefix(false);
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxNativeZoom: 19, maxZoom: 19, minZoom: 2,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });
        let tileFailed = false;
        const tileError = (): void => { tileFailed = true; if (!cancelled) setStatus('error'); };
        const tilesLoaded = (): void => { if (!cancelled && !tileFailed) setStatus('ready'); };
        tiles.on('tileerror', tileError).on('load', tilesLoaded).addTo(instance);
        disposers.push(() => { tiles.off('tileerror', tileError).off('load', tilesLoaded); });

        const markers = journey.markers.map((marker) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'street-map-marker-button';
          button.textContent = marker.stops.length > 1 ? String(marker.stops.length) : '•';
          button.setAttribute('aria-label', `${marker.stops.map((stop) => `${stop.role.title} at ${stop.role.company}`).join('; ')}. ${marker.stops.length > 1 ? 'Select next role at this city.' : 'Select city.'}`);
          const activate = (event: MouseEvent): void => {
            event.stopPropagation();
            const index = nextMarkerIndex(marker, latest.current.selected);
            if (index !== undefined) latest.current.onSelect(index);
          };
          button.addEventListener('click', activate);
          L.DomEvent.disableClickPropagation(button);
          const point = L.marker(toMapPosition(marker.coordinates, instance.getCenter().lng), {
            icon: L.divIcon({ html: button, className: 'street-map-marker', iconSize: [48, 48], iconAnchor: [24, 24] }),
            keyboard: false, interactive: false,
          }).addTo(instance);
          disposers.push(() => { button.removeEventListener('click', activate); L.DomEvent.off(button); });
          return { marker, point, button };
        });

        const lines = routes.flatMap((route) => [-360, 0, 360].map((copy) => ({
          route, copy, line: L.polyline(route, {
            color: 'var(--color-ink)', weight: 2, opacity: 0.8, dashArray: '4 7',
            interactive: false, className: 'street-map-route',
          }).addTo(instance),
        })));
        const positionOverlays = (): void => {
          const longitude = instance.getCenter().lng;
          markers.forEach(({ marker, point }) => point.setLatLng(toMapPosition(marker.coordinates, longitude)));
          lines.forEach(({ route, copy, line }) => {
            const midpoint = route[Math.floor(route.length / 2)]![1];
            const offset = 360 * Math.round((longitude - midpoint) / 360) + copy;
            line.setLatLngs(route.map(([lat, lng]): MapPosition => [lat, lng + offset]));
          });
        };
        const select = (recenter: boolean): void => {
          markers.forEach(({ marker, button, point }) => {
            const active = marker.stops.some((stop) => stop.index === latest.current.selected);
            button.setAttribute('aria-pressed', String(active));
            point.setZIndexOffset(active ? 1000 : 0);
          });
          const coordinates = journey.stops.find((stop) => stop.index === latest.current.selected)?.coordinates;
          if (recenter && coordinates) instance.setView(toMapPosition(coordinates, instance.getCenter().lng), instance.getZoom(), { animate: false });
        };
        const rememberCamera = (): void => {
          camera.current = { center: fromMapCenter(instance.getCenter()), zoom: instance.getZoom() };
          setZoom(instance.getZoom());
          positionOverlays();
        };
        const zoomEnd = (): void => {
          rememberCamera();
          if (instance.getZoom() < 3 && !leaving.current) {
            leaving.current = true;
            latest.current.onBack(camera.current.center);
          }
        };
        instance.on('moveend', rememberCamera).on('zoomend', zoomEnd);
        disposers.push(() => { instance.off('moveend', rememberCamera).off('zoomend', zoomEnd); });

        // A single touch scrolls the page; Leaflet's two-finger handler owns pinch/pan.
        const touchStart = (): void => { instance.dragging.disable(); };
        const pointerStart = (event: PointerEvent): void => { if (event.pointerType !== 'touch') instance.dragging.enable(); };
        container.addEventListener('touchstart', touchStart, { capture: true, passive: true });
        container.addEventListener('pointerdown', pointerStart, true);
        disposers.push(() => {
          container.removeEventListener('touchstart', touchStart, true);
          container.removeEventListener('pointerdown', pointerStart, true);
        });

        let visible = !('IntersectionObserver' in window);
        const synchronizeMotion = (): void => {
          container.dataset.motion = visible && !document.hidden && !reduced.matches ? 'running' : 'paused';
        };
        const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
          visible = Boolean(entry?.isIntersecting); synchronizeMotion();
        }) : undefined;
        observer?.observe(container);
        document.addEventListener('visibilitychange', synchronizeMotion);
        reduced.addEventListener('change', synchronizeMotion);
        const resize = 'ResizeObserver' in window ? new ResizeObserver(() => { instance.invalidateSize({ animate: false, pan: false }); }) : undefined;
        resize?.observe(container);
        disposers.push(() => {
          observer?.disconnect(); resize?.disconnect();
          document.removeEventListener('visibilitychange', synchronizeMotion);
          reduced.removeEventListener('change', synchronizeMotion);
        });
        runtime.current = { map: instance, select };
        select(pendingFocus.current); pendingFocus.current = false;
        positionOverlays(); synchronizeMotion();
        setReady(true);
        container.focus({ preventScroll: true });
      } catch {
        if (cancelled) return;
        dispose();
        setStatus('error');
      }
    };
    void initialize();
    return () => { cancelled = true; dispose(); };
  }, [attempt, journey, routes]);

  const back = (): void => {
    if (leaving.current) return;
    leaving.current = true;
    onBack(runtime.current ? fromMapCenter(runtime.current.map.getCenter()) : camera.current.center);
  };
  return <div className="street-map">
    <div ref={host} role="region" aria-label="Interactive street map of work locations" aria-describedby={instructionsId}
      tabIndex={0} className="street-map-surface aspect-square w-full border border-rule" data-motion="paused" />
    <div role="group" aria-label="Street map controls" className="mt-4 flex flex-wrap gap-2 border-t border-rule pt-4">
      <button type="button" className="street-map-control min-h-12 min-w-12 border border-ink px-3" aria-label="Zoom in" disabled={!ready || zoom >= 19} onClick={() => runtime.current?.map.zoomIn()}>+</button>
      <button type="button" className="street-map-control min-h-12 min-w-12 border border-ink px-3" aria-label="Zoom out" disabled={!ready} onClick={() => runtime.current?.map.zoomOut()}>−</button>
      <button type="button" className="street-map-control min-h-12 border border-ink px-3" onClick={back}>Back to globe</button>
    </div>
    <p className="mt-3 text-base" aria-live="polite" aria-atomic="true">
      {status === 'loading' ? 'Loading street map…' : status === 'error' ? <>Street map couldn’t load. Check your connection and try again.{' '}
        <button type="button" className="min-h-12 underline underline-offset-4" onClick={() => setAttempt((value) => value + 1)}>Retry map</button></> : null}
    </p>
    <p id={instructionsId} className="mt-3 text-base leading-relaxed text-muted">Drag to pan · Use +/− or pinch to zoom. Use two fingers to move the map on touch screens.<span className="sr-only"> Arrow keys pan when the map is focused. Double-click also zooms. One finger scrolls the page. Zoom out to return to the globe.</span></p>
    <p className="mt-3 text-base leading-relaxed text-muted">Points mark offices where provided, or city centers. Dashed lines show career moves between locations.</p>
    <p className="mt-3 text-base">© <a className="underline underline-offset-4" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors</p>
  </div>;
}
