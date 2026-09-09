import { z } from 'zod';

import type { WorkPlace } from './profile';

const name = z.string().min(1).max(500);
export const countriesSchema = z.array(z.object({ code: z.string().regex(/^[A-Z]{2}$/), name })).max(300);
export const locationsSchema = z.object({
  regions: z.array(z.object({ code: name, name })).max(10_000),
  cities: z.array(z.object({
    id: name, name, regionCode: z.string().max(20),
    latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
  })).max(200_000),
});
export type Country = z.infer<typeof countriesSchema>[number];
export type LocationData = z.infer<typeof locationsSchema>;
export type City = LocationData['cities'][number];

/** Match city names accent-insensitively within an optional region. */
export function searchCities(data: LocationData, query: string, regionCode: string): City[] {
  const normalize = (value: string): string => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return data.cities.filter((city) => (!regionCode || city.regionCode === regionCode) && terms.every((term) => normalize(city.name).includes(term))).slice(0, 12);
}

/** Save the chosen label and coordinates together, without runtime geocoding. */
export function selectCity(country: Country, data: LocationData, city: City): { location: string; place: WorkPlace } {
  const region = data.regions.find((entry) => entry.code === city.regionCode);
  return {
    location: [city.name, region?.name, country.name].filter(Boolean).join(', '),
    place: { latitude: city.latitude, longitude: city.longitude, countryCode: country.code, ...(city.regionCode ? { regionCode: city.regionCode } : {}), city: city.name },
  };
}
