import { geoDistance, geoInterpolate } from 'd3-geo';

import type { Profile } from './profile';

/** A work role with optional explicitly supplied geography. */
export type JourneyExperience = Profile['experience'][number];
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
  if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)
    || Math.abs(place.latitude) > 90 || Math.abs(place.longitude) > 180) return null;
  return [Math.abs(place.latitude) === 90 ? 0 : place.longitude === 180 ? -180 : place.longitude, place.latitude];
}

/** Build chronological routes only between consecutive roles with unambiguous saved geography. */
export function buildWorkJourney(experience: readonly JourneyExperience[]): WorkJourney {
  const stops = experience.map((role, index): JourneyStop => ({
    index, role, coordinates: coordinatesFor(role.place), date: dateOrder(role.startDate),
  })).sort((a, b) => (a.date ?? Infinity) - (b.date ?? Infinity) || a.index - b.index);
  const markers: JourneyMarker[] = [];
  const legs: JourneyLeg[] = [];
  let ambiguousCount = 0;
  const hasInvalidDates = stops.some((stop) => stop.date === null);
  const latestMonth = (stop: JourneyStop): number => (stop.date ?? Infinity) + (stop.role.startDate.length === 4 ? 11 : 0);
  const ambiguousDates = new Set(stops.filter((stop) => stops.some((other) => other.index !== stop.index
    && stop.date !== null && other.date !== null && stop.date <= latestMonth(other) && other.date <= latestMonth(stop))).map((stop) => stop.index));
  for (const stop of stops) {
    if (!stop.coordinates) continue;
    const existing = markers.find((marker) => geoDistance(marker.coordinates, stop.coordinates!) < 1e-7);
    if (existing) existing.stops.push(stop);
    else markers.push({ key: stop.coordinates.join(','), coordinates: stop.coordinates, stops: [stop] });
  }
  for (let index = 1; index < stops.length && !hasInvalidDates; index++) {
    const from = stops[index - 1]!;
    const to = stops[index]!;
    if (!from.coordinates || !to.coordinates) continue;
    const distance = geoDistance(from.coordinates, to.coordinates);
    if (distance < 1e-7) continue;
    // Antipodes have no unique great circle; overlapping date precision gives no known direction.
    if (Math.PI - distance < 1e-6 || ambiguousDates.has(from.index) || ambiguousDates.has(to.index)) { ambiguousCount++; continue; }
    legs.push({ from: { ...from, coordinates: from.coordinates }, to: { ...to, coordinates: to.coordinates },
      interpolate: geoInterpolate(from.coordinates, to.coordinates) });
  }
  return { stops, markers, legs, unmappedCount: stops.filter((stop) => !stop.coordinates).length, ambiguousCount, hasInvalidDates };
}

/** Sample a leg in its earliest-to-latest direction, clamped to its endpoints. */
export function interpolateJourneyLeg(leg: JourneyLeg, progress: number): Coordinates {
  const amount = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  if (amount === 0) return [...leg.from.coordinates];
  if (amount === 1) return [...leg.to.coordinates];
  return leg.interpolate(amount);
}
