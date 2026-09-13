import { geoDistance, geoOrthographic, geoPath, type GeoPath, type GeoProjection } from 'd3-geo';
import type { LineString } from 'geojson';
import { useMemo } from 'react';

import { interpolateJourneyLeg, type Coordinates, type WorkJourney } from '../../lib/work-journey';
import type { GlobeView } from './globe-view';

interface GlobeProjection {
  projection: GeoProjection;
  path: GeoPath;
  routes: LineString[];
  particlePoint: [number, number] | null;
  isVisible: (coordinates: Coordinates) => boolean;
}

/** Project the current camera, sampled journey routes, and animated route particle. */
export function useGlobeProjection(journey: WorkJourney, view: GlobeView): GlobeProjection {
  const projection = useMemo(
    () =>
      geoOrthographic()
        .translate([250, 250])
        .scale(215 * view.zoom)
        .rotate([view.rotation[0], view.rotation[1], 0])
        .clipAngle(90)
        .precision(0.5),
    [view.rotation, view.zoom],
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const routes = useMemo(
    () =>
      journey.legs.map((leg) => ({
        type: 'LineString' as const,
        coordinates: Array.from({ length: 49 }, (_, index) =>
          interpolateJourneyLeg(leg, index / 48),
        ),
      })),
    [journey],
  );
  const center: Coordinates = [-view.rotation[0], -view.rotation[1]];
  const isVisible = (coordinates: Coordinates): boolean =>
    geoDistance(center, coordinates) < Math.PI / 2 - 0.01;
  const activeLegIndex = journey.legs.length
    ? Math.floor(view.elapsed / 4) % journey.legs.length
    : -1;
  const activeLeg = journey.legs[activeLegIndex];
  const particle = activeLeg ? interpolateJourneyLeg(activeLeg, (view.elapsed % 4) / 4) : null;
  const particlePoint = particle && isVisible(particle) ? projection(particle) : null;
  return { projection, path, routes, particlePoint, isVisible };
}
