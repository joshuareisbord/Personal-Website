import type { Map as LeafletMap } from 'leaflet';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import { buildStreetRoutes, fromMapCenter, toMapPosition } from '../../lib/street-map-data';
import type { StreetMapProps } from '../street-map';
import {
  installStreetTouchPolicy,
  observeStreetViewport,
  releaseActivePinch,
} from './street-map-lifecycle';
import { createStreetOverlays } from './street-map-overlays';

interface StreetMapRuntime {
  map: LeafletMap;
  select: (recenter: boolean) => void;
}

interface StreetMapControls {
  host: RefObject<HTMLDivElement | null>;
  status: 'loading' | 'ready' | 'error';
  ready: boolean;
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  back: () => void;
  retry: () => void;
}

/** Own lazy Leaflet setup, current selection/camera, retries, and teardown. */
export function useStreetMap({
  journey,
  selected,
  initialCenter,
  initialZoom,
  onSelect,
  onBack,
}: StreetMapProps): StreetMapControls {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<StreetMapRuntime | null>(null);
  const camera = useRef({ center: initialCenter, zoom: Math.max(2, Math.min(19, initialZoom)) });
  const latest = useRef({ selected, onSelect, onBack });
  const previousSelection = useRef(selected);
  const pendingRecenter = useRef(false);
  const leaving = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(camera.current.zoom);
  const routes = useMemo(() => buildStreetRoutes(journey), [journey]);

  useEffect(() => {
    latest.current = { selected, onSelect, onBack };
  }, [selected, onSelect, onBack]);

  useEffect(() => {
    if (previousSelection.current === selected) return;
    previousSelection.current = selected;
    pendingRecenter.current = true;
    if (runtime.current) {
      runtime.current.select(true);
      pendingRecenter.current = false;
    }
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
        const [leaflet] = await Promise.all([
          import('leaflet'),
          import('leaflet/dist/leaflet.css'),
          import('../street-map.css'),
        ]);
        if (cancelled) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        const instance = leaflet.map(container, {
          center: toMapPosition(camera.current.center),
          zoom: camera.current.zoom,
          minZoom: 2,
          maxZoom: 19,
          scrollWheelZoom: false,
          zoomControl: false,
          attributionControl: true,
          keyboard: true,
          doubleClickZoom: true,
          touchZoom: true,
          bounceAtZoomLimits: false,
          worldCopyJump: true,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        });
        map = instance;
        disposers.push(() => releaseActivePinch(leaflet, instance));
        instance.attributionControl.setPrefix(false);
        const tiles = leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxNativeZoom: 19,
          maxZoom: 19,
          minZoom: 2,
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });
        let tileFailed = false;
        const tileError = (): void => {
          tileFailed = true;
          if (!cancelled) setStatus('error');
        };
        const tilesLoaded = (): void => {
          if (!cancelled && !tileFailed) setStatus('ready');
        };
        tiles.on('tileerror', tileError).on('load', tilesLoaded).addTo(instance);
        disposers.push(() => {
          tiles.off('tileerror', tileError).off('load', tilesLoaded);
        });

        const { positionOverlays, select } = createStreetOverlays(
          leaflet,
          instance,
          journey,
          routes,
          latest,
          disposers,
        );
        const rememberCamera = (): void => {
          camera.current = {
            center: fromMapCenter(instance.getCenter()),
            zoom: instance.getZoom(),
          };
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
        disposers.push(() => {
          instance.off('moveend', rememberCamera).off('zoomend', zoomEnd);
        });

        disposers.push(installStreetTouchPolicy(container, instance));

        const viewport = observeStreetViewport(container, instance, reduced);
        disposers.push(viewport.dispose);
        runtime.current = { map: instance, select };
        select(pendingRecenter.current);
        pendingRecenter.current = false;
        positionOverlays();
        viewport.synchronizeMotion();
        setReady(true);
        container.focus({ preventScroll: true });
      } catch {
        if (cancelled) return;
        dispose();
        setStatus('error');
      }
    };
    void initialize();
    return () => {
      cancelled = true;
      dispose();
    };
  }, [attempt, journey, routes]);

  const back = (): void => {
    if (leaving.current) return;
    leaving.current = true;
    onBack(
      runtime.current ? fromMapCenter(runtime.current.map.getCenter()) : camera.current.center,
    );
  };
  return {
    host,
    status,
    ready,
    zoom,
    back,
    zoomIn: () => {
      runtime.current?.map.zoomIn();
    },
    zoomOut: () => {
      runtime.current?.map.zoomOut();
    },
    retry: () => setAttempt((value) => value + 1),
  };
}
