import { interpolateJourneyLeg, type Coordinates, type JourneyMarker, type WorkJourney } from './work-journey';

export type MapPosition = [latitude: number, longitude: number];
const mercatorLimit = 85.0511287798066;

/** Return a saved place in Leaflet order, in the world nearest the current camera. */
export function toMapPosition([longitude, latitude]: Coordinates, nearLongitude = longitude): MapPosition {
  return [Math.max(-mercatorLimit, Math.min(mercatorLimit, latitude)),
    longitude + 360 * Math.round((nearLongitude - longitude) / 360)];
}

/** Return a Leaflet camera to the globe's longitude-first, canonical world coordinates. */
export function fromMapCenter({ lng, lat }: { lng: number; lat: number }): Coordinates {
  return [((lng + 180) % 360 + 360) % 360 - 180, Math.max(-90, Math.min(90, lat))];
}

/** Sample chronological great circles continuously across the antimeridian. */
export function buildStreetRoutes(journey: WorkJourney): MapPosition[][] {
  return journey.legs.map((leg) => {
    let longitude = leg.from.coordinates[0];
    return Array.from({ length: 97 }, (_, index) => {
      const point = toMapPosition(interpolateJourneyLeg(leg, index / 96), longitude);
      longitude = point[1];
      return point;
    });
  });
}

/** Cycle co-located roles in their existing chronological order. */
export function nextMarkerIndex(marker: JourneyMarker, selected: number | undefined): number | undefined {
  const current = marker.stops.findIndex((stop) => stop.index === selected);
  return marker.stops[(current + 1) % marker.stops.length]?.index;
}
