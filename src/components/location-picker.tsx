import { useEffect, useId, useMemo, useRef, useState, type ReactElement } from 'react';

import { countriesSchema, locationsSchema, searchCities, selectCity, type City, type Country, type LocationData } from '../lib/locations';
import type { WorkPlace } from '../lib/profile';
import { buttonClass, controlClass } from './editor-styles';
import { OfficePicker } from './office-picker';

interface Props { location: string | undefined; place: WorkPlace | undefined; onChange: (location: string | undefined, place: WorkPlace | undefined) => void; }

/** Choose a city from local geographic data, retaining existing text until a choice is made. */
export function LocationPicker({ location, place, onChange }: Props): ReactElement {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [countryCode, setCountryCode] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [countries, setCountries] = useState<Country[]>([]);
  const [data, setData] = useState<LocationData | null>(null);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    const request = new AbortController();
    setLoadingCountries(true); setError('');
    void fetch('/geography/countries.json', { signal: request.signal }).then(async (response) => {
      if (!response.ok) throw new Error('Countries unavailable.');
      const result = countriesSchema.parse(await response.json());
      if (!request.signal.aborted) setCountries(result);
    }).catch(() => { if (!request.signal.aborted) setError('Could not load locations. Your current location is unchanged.'); })
      .finally(() => { if (!request.signal.aborted) setLoadingCountries(false); });
    return () => request.abort();
  }, [open, retry]);
  useEffect(() => {
    setData(null); setLoadingCities(false);
    if (!open || !/^[A-Z]{2}$/.test(countryCode)) return;
    const request = new AbortController();
    setLoadingCities(true); setError('');
    void fetch(`/geography/locations/${countryCode}.json`, { signal: request.signal }).then(async (response) => {
      if (!response.ok) throw new Error('Cities unavailable.');
      const result = locationsSchema.parse(await response.json());
      if (!request.signal.aborted) setData(result);
    }).catch(() => { if (!request.signal.aborted) setError('Could not load cities. Try again or choose a different country.'); })
      .finally(() => { if (!request.signal.aborted) setLoadingCities(false); });
    return () => request.abort();
  }, [open, countryCode, retry]);
  const matches = useMemo(() => data ? searchCities(data, query, regionCode) : [], [data, query, regionCode]);
  const close = (): void => { setOpen(false); trigger.current?.focus(); };
  const choose = (city: City): void => {
    const country = countries.find((entry) => entry.code === countryCode);
    if (!country || !data) return;
    const selected = selectCity(country, data, city);
    onChange(selected.location, selected.place); close();
  };
  return <div className="min-w-0">
    <div className="flex items-baseline justify-between gap-3"><span id={`${id}-label`} className="text-base font-medium">Location</span><span className="font-mono text-xs text-muted">Optional</span></div>
    <button ref={trigger} type="button" aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-picker`} className={`${controlClass} flex items-center justify-between gap-3 text-left`} onClick={() => {
      if (open) { close(); return; }
      setCountryCode(place?.countryCode ?? ''); setRegionCode(place?.regionCode ?? ''); setQuery(''); setActive(-1); setOpen(true);
    }}><span id={`${id}-value`} className="min-w-0 break-words">{location || 'Choose a location'}</span><span aria-hidden="true">{open ? '−' : '+'}</span></button>
    {location && !place && location !== 'Remote' && <p className="mt-2 text-sm text-muted">Choose a city to add this location to the globe.</p>}
    {!open && place?.city && location && <OfficePicker key={JSON.stringify([location, place.latitude, place.longitude])} location={location} place={place} onChange={(office) => {
      const { office: _oldOffice, ...city } = place;
      onChange(location, office ? { ...city, office } : city);
    }} />}
    {open && <div id={`${id}-picker`} className="mt-3 space-y-4 border border-rule p-4 sm:p-5" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); close(); } }}>
      <p className="text-sm leading-relaxed text-muted">Select a city to place this role on the globe. You can also mark it as remote or leave the location empty.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="min-w-0 text-sm" htmlFor={`${id}-country`}>Country<select id={`${id}-country`} className={controlClass} value={countryCode} disabled={loadingCountries} onChange={(event) => { setCountryCode(event.target.value); setRegionCode(''); setQuery(''); setActive(-1); }}>
          <option value="">{loadingCountries ? 'Loading countries…' : 'Choose a country'}</option>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
        </select></label>
        <label className="min-w-0 text-sm" htmlFor={`${id}-region`}>State / province<select id={`${id}-region`} className={controlClass} value={regionCode} disabled={!data || loadingCities} onChange={(event) => { setRegionCode(event.target.value); setActive(-1); }}>
          <option value="">All regions</option>{data?.regions.map((region) => <option key={region.code} value={region.code}>{region.name}</option>)}
        </select></label>
      </div>
      <div>
        <label htmlFor={`${id}-city`} className="text-sm">Search city</label>
        <input id={`${id}-city`} type="search" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={matches.length > 0} aria-controls={`${id}-results`} aria-activedescendant={active >= 0 && matches[active] ? `${id}-result-${active}` : undefined} aria-describedby={`${id}-hint`} className={controlClass} placeholder="Start typing a city name" disabled={!data || loadingCities} value={query} onChange={(event) => { setQuery(event.target.value); setActive(-1); }} onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => !matches.length ? -1 : index < 0 ? (event.key === 'ArrowDown' ? 0 : matches.length - 1) : (index + (event.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length);
          }
          if (event.key === 'Enter') { event.preventDefault(); if (matches[active]) choose(matches[active]); }
        }} />
        <ul id={`${id}-results`} role="listbox" aria-label="Matching cities" className="max-h-64 overflow-y-auto">
          {matches.map((city, index) => <li key={city.id} id={`${id}-result-${index}`} role="option" aria-selected={active === index} className={`min-h-12 cursor-pointer border-x border-b border-rule px-3 py-3 text-base ${active === index ? 'bg-ink text-paper' : 'hover:bg-rule'}`} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(city)}>
            {city.name}<span className="ml-2 text-sm">{data?.regions.find((region) => region.code === city.regionCode)?.name}</span>
          </li>)}
        </ul>
        <p id={`${id}-hint`} role="status" className="mt-2 text-sm text-muted">{loadingCities ? 'Loading cities…' : query.trim() && data ? (matches.length ? `${matches.length} matches shown. Narrow your search if needed. Use arrow keys and Enter to select.` : 'No matching cities in this region. Try another spelling or select all regions.') : 'Searches stay on this website.'}</p>
      </div>
      {error && <div role="alert" className="border border-ink p-3"><p className="mb-3 text-sm">{error}</p><button type="button" className={buttonClass} onClick={() => setRetry((value) => value + 1)}>Retry locations</button></div>}
      <div className="flex flex-wrap gap-3">
        <button type="button" className={buttonClass} onClick={() => { onChange('Remote', undefined); close(); }}>Remote</button>
        <button type="button" className={buttonClass} onClick={() => { onChange(undefined, undefined); close(); }}>Clear location</button>
        <button type="button" className={buttonClass} onClick={close}>Cancel</button>
      </div>
    </div>}
  </div>;
}
