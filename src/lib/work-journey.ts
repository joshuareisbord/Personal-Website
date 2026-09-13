import { geoDistance, geoInterpolate } from 'd3-geo';

import type { WorkExperience } from './profile';

/** A work role with optional explicitly supplied geography. */
export type JourneyExperience = WorkExperience;
export type Coordinates = [longitude: number, latitude: number];

export interface JourneyStop {
  index: number;
  role: JourneyExperience;
  coordinates: Coordinates | null;
  date: number | null;
}

export interface JourneyMarker {
  key: string;
  coordinates: Coordinates;
  stops: JourneyStop[];
}

export interface JourneyLeg {
  from: JourneyStop & { coordinates: Coordinates };
  to: JourneyStop & { coordinates: Coordinates };
  interpolate: (progress: number) => Coordinates;
}

export interface WorkJourney {
  stops: JourneyStop[];
  markers: JourneyMarker[];
  legs: JourneyLeg[];
  unmappedCount: number;
  ambiguousCount: number;
  hasInvalidDates: boolean;
}

function dateOrder(value: string): number | null {
  if (!/^[1-9]\d{3}(?:-(?:0[1-9]|1[0-2]))?$/.test(value)) return null;
  return Number(value.slice(0, 4)) * 12 + Number(value.slice(5) || '1') - 1;
}

function coordinatesFor(place: JourneyExperience['place']): Coordinates | null {
  if (
    !place ||
    !Number.isFinite(place.latitude) ||
    !Number.isFinite(place.longitude) ||
    Math.abs(place.latitude) > 90 ||
    Math.abs(place.longitude) > 180
  )
    return null;
  const office = place.office;
  if (
    office !== undefined &&
    (!office ||
      typeof office !== 'object' ||
      Array.isArray(office) ||
      typeof office.address !== 'string' ||
      !office.address.trim() ||
      office.address.length > 500 ||
      typeof place.city !== 'string' ||
      !place.city.trim() ||
      place.city.length > 500 ||
      Object.keys(office).some((key) => !['address', 'latitude', 'longitude'].includes(key)))
  )
    return null;
  const coordinates = office === undefined ? place : office;
  if (
    !Number.isFinite(coordinates.latitude) ||
    !Number.isFinite(coordinates.longitude) ||
    Math.abs(coordinates.latitude) > 90 ||
    Math.abs(coordinates.longitude) > 180
  )
    return null;
  return [
    Math.abs(coordinates.latitude) === 90
      ? 0
      : coordinates.longitude === 180
        ? -180
        : coordinates.longitude,
    coordinates.latitude,
  ];
}

function latestPossibleStartMonth(stop: JourneyStop): number {
  const unknownMonths = stop.role.startDate.length === 4 ? 11 : 0;
  return (stop.date ?? Infinity) + unknownMonths;
}

function findAmbiguousStarts(stops: JourneyStop[]): Set<number> {
  const overlappingStops = stops.filter((stop) =>
    stops.some((other) => {
      if (other.index === stop.index || stop.date === null || other.date === null) return false;
      return (
        stop.date <= latestPossibleStartMonth(other) && other.date <= latestPossibleStartMonth(stop)
      );
    }),
  );
  return new Set(overlappingStops.map((stop) => stop.index));
}

function groupMarkers(stops: JourneyStop[]): JourneyMarker[] {
  const markers: JourneyMarker[] = [];
  for (const stop of stops) {
    const coordinates = stop.coordinates;
    if (!coordinates) continue;
    const existing = markers.find((marker) => geoDistance(marker.coordinates, coordinates) < 1e-7);
    if (existing) existing.stops.push(stop);
    else markers.push({ key: coordinates.join(','), coordinates, stops: [stop] });
  }
  return markers;
}

interface JourneyRoutes {
  legs: JourneyLeg[];
  ambiguousCount: number;
}

function connectConsecutiveStops(stops: JourneyStop[]): JourneyRoutes {
  const ambiguousStarts = findAmbiguousStarts(stops);
  const legs: JourneyLeg[] = [];
  let ambiguousCount = 0;

  for (const [index, to] of stops.entries()) {
    const from = stops[index - 1];
    if (!from?.coordinates || !to.coordinates) continue;
    const distance = geoDistance(from.coordinates, to.coordinates);
    if (distance < 1e-7) continue;

    // Antipodes have no unique great circle; overlapping date precision gives no known direction.
    const isAmbiguous =
      Math.PI - distance < 1e-6 || ambiguousStarts.has(from.index) || ambiguousStarts.has(to.index);
    if (isAmbiguous) {
      ambiguousCount++;
      continue;
    }
    legs.push({
      from: { ...from, coordinates: from.coordinates },
      to: { ...to, coordinates: to.coordinates },
      interpolate: geoInterpolate(from.coordinates, to.coordinates),
    });
  }
  return { legs, ambiguousCount };
}

/** Build chronological routes only between consecutive roles with unambiguous saved geography. */
export function buildWorkJourney(experience: readonly JourneyExperience[]): WorkJourney {
  const stops = experience
    .map((role, index): JourneyStop => ({
      index,
      role,
      coordinates: coordinatesFor(role.place),
      date: dateOrder(role.startDate),
    }))
    .sort(
      (first, second) =>
        (first.date ?? Infinity) - (second.date ?? Infinity) || first.index - second.index,
    );
  const hasInvalidDates = stops.some((stop) => stop.date === null);
  const routes: JourneyRoutes = hasInvalidDates
    ? { legs: [], ambiguousCount: 0 }
    : connectConsecutiveStops(stops);

  return {
    stops,
    markers: groupMarkers(stops),
    ...routes,
    unmappedCount: stops.filter((stop) => !stop.coordinates).length,
    hasInvalidDates,
  };
}

/** Sample a leg in its earliest-to-latest direction, clamped to its endpoints. */
export function interpolateJourneyLeg(leg: JourneyLeg, progress: number): Coordinates {
  const amount = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  if (amount === 0) return [...leg.from.coordinates];
  if (amount === 1) return [...leg.to.coordinates];
  return leg.interpolate(amount);
}
