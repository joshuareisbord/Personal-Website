import type { Coordinates } from '../../lib/work-journey';

export interface GlobeView {
  rotation: Coordinates;
  zoom: number;
  elapsed: number;
}
export interface StreetView {
  center: Coordinates;
  zoom: number;
}

/** Turn a saved longitude/latitude into the globe camera rotation. */
export function globeRotation(coordinates: Coordinates | null | undefined): Coordinates {
  return coordinates ? [-coordinates[0], -coordinates[1]] : [20, -20];
}
