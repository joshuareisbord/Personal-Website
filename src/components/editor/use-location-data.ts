import { useEffect, useState } from 'react';
import {
  countriesSchema,
  locationsSchema,
  type Country,
  type LocationData,
} from '../../lib/locations';

interface LocationDataState {
  countries: Country[];
  data: LocationData | null;
  loadingCountries: boolean;
  loadingCities: boolean;
  error: string;
  retryLocations: () => void;
}

/** Load country and city choices only while the picker is open, cancelling stale requests. */
export function useLocationData(open: boolean, countryCode: string): LocationDataState {
  const [countries, setCountries] = useState<Country[]>([]);
  const [data, setData] = useState<LocationData | null>(null);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    const request = new AbortController();
    setLoadingCountries(true);
    setError('');
    void fetch('/geography/countries.json', { signal: request.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Countries unavailable.');
        const result = countriesSchema.parse(await response.json());
        if (!request.signal.aborted) setCountries(result);
      })
      .catch(() => {
        if (!request.signal.aborted)
          setError('Could not load locations. Your current location is unchanged.');
      })
      .finally(() => {
        if (!request.signal.aborted) setLoadingCountries(false);
      });
    return () => request.abort();
  }, [open, retry]);
  useEffect(() => {
    setData(null);
    setLoadingCities(false);
    if (!open || !/^[A-Z]{2}$/.test(countryCode)) return;
    const request = new AbortController();
    setLoadingCities(true);
    setError('');
    void fetch(`/geography/locations/${countryCode}.json`, { signal: request.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Cities unavailable.');
        const result = locationsSchema.parse(await response.json());
        if (!request.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!request.signal.aborted)
          setError('Could not load cities. Try again or choose a different country.');
      })
      .finally(() => {
        if (!request.signal.aborted) setLoadingCities(false);
      });
    return () => request.abort();
  }, [open, countryCode, retry]);

  const retryLocations = (): void => setRetry((value) => value + 1);
  return { countries, data, loadingCountries, loadingCities, error, retryLocations };
}
