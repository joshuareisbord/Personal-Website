import { z } from 'zod';

import type { WorkOffice, WorkPlace } from './profile';

const text = z.string().trim().min(1).max(500);
const resultsSchema = z.object({
  features: z
    .array(
      z.object({
        geometry: z.object({
          type: z.literal('Point'),
          coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
        }),
        properties: z.object({
          name: text.optional(),
          street: text.optional(),
          housenumber: text.optional(),
          postcode: text.optional(),
          city: text.optional(),
          district: text.optional(),
          state: text.optional(),
          country: text.optional(),
          countrycode: text,
          type: text.optional(),
        }),
      }),
    )
    .max(50),
});
const cache = new Map<string, WorkOffice[]>();
let nextSearch = 0;

/** Validate address results, excluding city/street centroids and other countries. */
export function parseOfficeResults(value: unknown, countryCode: string): WorkOffice[] {
  return resultsSchema
    .parse(value)
    .features.flatMap(({ geometry, properties: p }) => {
      if (p.countrycode.toUpperCase() !== countryCode || !p.street || !p.housenumber) return [];
      const address = [
        p.name,
        `${p.housenumber} ${p.street}`,
        p.city || p.district,
        p.state,
        p.postcode,
        p.country,
      ]
        .filter(Boolean)
        .join(', ');
      if (address.length > 500) return [];
      return [{ address, longitude: geometry.coordinates[0], latitude: geometry.coordinates[1] }];
    })
    .slice(0, 6);
}

/** Look up an office only after an explicit owner search; never during public rendering. */
export async function searchOffices(
  query: string,
  location: string,
  place: WorkPlace,
  signal: AbortSignal,
): Promise<WorkOffice[]> {
  const address = text.parse(query);
  const url = new URL('https://photon.komoot.io/api/');
  url.search = new URLSearchParams({
    q: `${address}, ${location}`,
    countrycode: place.countryCode,
    lat: String(place.latitude),
    lon: String(place.longitude),
    limit: '6',
    lang: 'en',
  }).toString();
  const key = url.href;
  if (signal.aborted) throw new Error('Search cancelled.');
  const cached = cache.get(key);
  if (cached) return cached;
  if (Date.now() < nextSearch) throw new Error('Please wait a moment before searching again.');
  nextSearch = Date.now() + 1_100;
  const response = await fetch(url, {
    signal,
    credentials: 'omit',
    referrerPolicy: 'strict-origin-when-cross-origin',
  });
  if (!response.ok)
    throw new Error(
      'Address search is unavailable. Try again shortly. Your saved location is unchanged.',
    );
  let results: WorkOffice[];
  try {
    results = parseOfficeResults(await response.json(), place.countryCode);
  } catch {
    throw new Error(
      'Address search returned an invalid response. Try again; your saved location is unchanged.',
    );
  }
  if (signal.aborted) throw new Error('Search cancelled.');
  const oldestCacheKey = cache.keys().next().value;
  if (cache.size >= 50 && oldestCacheKey !== undefined) cache.delete(oldestCacheKey);
  cache.set(key, results);
  return results;
}
