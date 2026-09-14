import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';

import { searchCities, selectCity, type City } from '../lib/locations';
import type { WorkPlace } from '../lib/profile';
import { buttonClass, controlClass } from './editor-styles';
import { OfficePicker } from './office-picker';
import { useLocationData } from './editor/use-location-data';

interface LocationPickerProps {
  location: string | undefined;
  place: WorkPlace | undefined;
  onChange: (location: string | undefined, place: WorkPlace | undefined) => void;
}

function nextCityIndex(index: number, count: number, direction: 'ArrowDown' | 'ArrowUp'): number {
  if (count === 0) return -1;
  if (index < 0) return direction === 'ArrowDown' ? 0 : count - 1;
  const offset = direction === 'ArrowDown' ? 1 : count - 1;
  return (index + offset) % count;
}

interface CitySearchStatus {
  isLoading: boolean;
  hasQuery: boolean;
  hasData: boolean;
  matchCount: number;
}

function citySearchHint({ isLoading, hasQuery, hasData, matchCount }: CitySearchStatus): string {
  if (isLoading) return 'Loading cities…';
  if (!hasQuery || !hasData) return 'Searches stay on this website.';
  if (matchCount === 0)
    return 'No matching cities in this region. Try another spelling or select all regions.';
  return `${matchCount} matches shown. Narrow your search if needed. Use arrow keys and Enter to select.`;
}

/** Choose a city from local geographic data, retaining existing text until a choice is made. */
export function LocationPicker({ location, place, onChange }: LocationPickerProps): ReactElement {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [countryCode, setCountryCode] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const { countries, data, loadingCountries, loadingCities, error, retryLocations } =
    useLocationData(open, countryCode);
  const matches = useMemo(
    () => (data ? searchCities(data, query, regionCode) : []),
    [data, query, regionCode],
  );
  const close = (): void => {
    setOpen(false);
    trigger.current?.focus();
  };
  const choose = (city: City): void => {
    const country = countries.find((entry) => entry.code === countryCode);
    if (!country || !data) return;
    const selected = selectCity(country, data, city);
    onChange(selected.location, selected.place);
    close();
  };
  const togglePicker = (): void => {
    if (open) {
      close();
      return;
    }
    setCountryCode(place?.countryCode ?? '');
    setRegionCode(place?.regionCode ?? '');
    setQuery('');
    setActive(-1);
    setOpen(true);
  };
  const handleCityKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    const key = event.key;
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => nextCityIndex(index, matches.length, key));
    }
    if (key === 'Enter') {
      event.preventDefault();
      const city = matches[active];
      if (city) choose(city);
    }
  };
  const hint = citySearchHint({
    isLoading: loadingCities,
    hasQuery: Boolean(query.trim()),
    hasData: Boolean(data),
    matchCount: matches.length,
  });
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span id={`${id}-label`} className="text-base font-medium">
          Location
        </span>
        <span className="font-mono text-xs text-muted">Optional</span>
      </div>
      <button
        ref={trigger}
        type="button"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-expanded={open}
        aria-controls={`${id}-picker`}
        className={`${controlClass} flex items-center justify-between gap-3 text-left`}
        onClick={togglePicker}
      >
        <span id={`${id}-value`} className="min-w-0 break-words">
          {location || 'Choose a location'}
        </span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {location && !place && location !== 'Remote' && (
        <p className="mt-2 text-sm text-muted">Choose a city to add this location to the globe.</p>
      )}
      {!open && place?.city && location && (
        <OfficePicker
          key={JSON.stringify([location, place.latitude, place.longitude])}
          location={location}
          place={place}
          onChange={(office) => {
            const { office: _oldOffice, ...city } = place;
            onChange(location, office ? { ...city, office } : city);
          }}
        />
      )}
      {open && (
        <div
          id={`${id}-picker`}
          className="mt-3 space-y-4 border border-rule p-4 sm:p-5"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              event.preventDefault();
              close();
            }
          }}
        >
          <p className="text-sm leading-relaxed text-muted">
            Select a city to place this role on the globe. You can also mark it as remote or leave
            the location empty.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="min-w-0 text-sm" htmlFor={`${id}-country`}>
              Country
              <select
                id={`${id}-country`}
                className={controlClass}
                value={countryCode}
                disabled={loadingCountries}
                onChange={(event) => {
                  setCountryCode(event.target.value);
                  setRegionCode('');
                  setQuery('');
                  setActive(-1);
                }}
              >
                <option value="">
                  {loadingCountries ? 'Loading countries…' : 'Choose a country'}
                </option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-sm" htmlFor={`${id}-region`}>
              State / province
              <select
                id={`${id}-region`}
                className={controlClass}
                value={regionCode}
                disabled={!data || loadingCities}
                onChange={(event) => {
                  setRegionCode(event.target.value);
                  setActive(-1);
                }}
              >
                <option value="">All regions</option>
                {data?.regions.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <label htmlFor={`${id}-city`} className="text-sm">
              Search city
            </label>
            <input
              id={`${id}-city`}
              type="search"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={matches.length > 0}
              aria-controls={`${id}-results`}
              aria-activedescendant={
                active >= 0 && matches[active] ? `${id}-result-${active}` : undefined
              }
              aria-describedby={`${id}-hint`}
              className={controlClass}
              placeholder="Start typing a city name"
              disabled={!data || loadingCities}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(-1);
              }}
              onKeyDown={handleCityKeyDown}
            />
            <ul
              id={`${id}-results`}
              role="listbox"
              aria-label="Matching cities"
              className="max-h-64 overflow-y-auto"
            >
              {matches.map((city, index) => (
                <li
                  key={city.id}
                  id={`${id}-result-${index}`}
                  role="option"
                  aria-selected={active === index}
                  className={`min-h-12 cursor-pointer border-x border-b border-rule px-3 py-3 text-base ${active === index ? 'bg-ink text-paper' : 'hover:bg-rule'}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(city)}
                >
                  {city.name}
                  <span className="ml-2 text-sm">
                    {data?.regions.find((region) => region.code === city.regionCode)?.name}
                  </span>
                </li>
              ))}
            </ul>
            <p id={`${id}-hint`} role="status" className="mt-2 text-sm text-muted">
              {hint}
            </p>
          </div>
          {error && (
            <div role="alert" className="border border-ink p-3">
              <p className="mb-3 text-sm">{error}</p>
              <button type="button" className={buttonClass} onClick={retryLocations}>
                Retry locations
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                onChange('Remote', undefined);
                close();
              }}
            >
              Remote
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                onChange(undefined, undefined);
                close();
              }}
            >
              Clear location
            </button>
            <button type="button" className={buttonClass} onClick={close}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
