import { useEffect, useState, type RefObject } from 'react';
import { mesh } from 'topojson-client';
import type { Objects, Topology } from 'topojson-specification';
import type { MultiLineString } from 'geojson';

export interface Boundaries {
  coast: MultiLineString;
  countries: MultiLineString;
  regions: MultiLineString;
}
export type BoundaryState =
  { status: 'waiting' | 'loading' | 'error' } | { status: 'ready'; data: Boundaries };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Check the required envelope here; malformed geometry is handled by the mesh-loading fallback.
function isBoundaryTopology(value: unknown): value is Topology<Objects<Record<string, unknown>>> {
  return (
    isRecord(value) &&
    value.type === 'Topology' &&
    Array.isArray(value.arcs) &&
    isRecord(value.objects) &&
    isRecord(value.objects.countries) &&
    isRecord(value.objects.admin1)
  );
}

/** Load local boundary meshes near the viewport, with retry, timeout, and cancellation. */
export function useBoundaries(
  container: RefObject<HTMLDivElement | null>,
  attempt: number,
): BoundaryState {
  const [nearby, setNearby] = useState(false);
  const [state, setState] = useState<BoundaryState>({ status: 'waiting' });
  useEffect(() => {
    if (!container.current) return;
    if (!('IntersectionObserver' in window)) {
      setNearby(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNearby(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' },
    );
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
        const response = await fetch('/geography/boundaries.topo.json', {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Geography request failed: ${response.status}`);
        const payload: unknown = await response.json();
        if (!isBoundaryTopology(payload)) {
          throw new Error('Geography is missing its country or regional boundaries.');
        }
        const data = payload;
        const boundaries = {
          coast: mesh(data, data.objects.countries, (a, b) => a === b),
          countries: mesh(data, data.objects.countries, (a, b) => a !== b),
          regions: mesh(data, data.objects.admin1),
        };
        if (!disposed) setState({ status: 'ready', data: boundaries });
      } catch {
        if (!disposed) setState({ status: 'error' });
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => {
      disposed = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [nearby, attempt]);
  return state;
}
