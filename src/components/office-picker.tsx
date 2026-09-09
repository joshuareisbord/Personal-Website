import { useEffect, useId, useRef, useState, type ReactElement } from 'react';

import { searchOffices } from '../lib/office-search';
import type { WorkOffice, WorkPlace } from '../lib/profile';
import { buttonClass, controlClass } from './editor-styles';

interface Props { location: string; place: WorkPlace; onChange: (office: WorkOffice | undefined) => void; }

/** Refine an already selected city with an optional, explicitly confirmed office address. */
export function OfficePicker({ location, place, onChange }: Props): ReactElement {
  const id = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WorkOffice[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
  const cancel = (): void => { request.current?.abort(); request.current = null; setBusy(false); setResults([]); setStatus(''); };
  const search = async (): Promise<void> => {
    if (!query.trim() || busy) return;
    cancel();
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort('timeout'), 15_000);
    setBusy(true);
    try {
      const matches = await searchOffices(query.trim(), location, place, controller.signal);
      if (request.current !== controller || controller.signal.aborted) return;
      setResults(matches);
      setStatus(matches.length ? 'Choose the matching address below to use its pin.' : 'No numbered street address found. Try the full street number and name, or keep the city pin.');
    } catch (error) {
      if (request.current !== controller) return;
      setStatus(controller.signal.reason === 'timeout' ? 'Address search timed out. Try again; your saved location is unchanged.' : error instanceof Error && !controller.signal.aborted ? error.message : 'Could not search addresses. Your saved location is unchanged.');
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  };
  return <div className="mt-5 space-y-3 border-t border-rule pt-5">
    <div className="flex items-baseline justify-between gap-3"><label htmlFor={id} className="text-base font-medium">Office address</label><span className="font-mono text-xs text-muted">Optional</span></div>
    <p id={`${id}-hint`} className="text-sm leading-relaxed text-muted">The job label stays {location}. An office pin is visible on the public map; the street address is not shown in the job text.</p>
    {place.office && <div className="space-y-2 border border-rule p-3">
      <p className="text-sm font-medium">Selected office</p><p className="break-words text-base">{place.office.address}</p>
      <div className="flex flex-wrap gap-3">
        <a className={`${buttonClass} inline-flex items-center`} href={`https://www.openstreetmap.org/?mlat=${place.office.latitude}&mlon=${place.office.longitude}#map=19/${place.office.latitude}/${place.office.longitude}`} target="_blank" rel="noopener noreferrer">Check pin ↗</a>
        <button type="button" className={buttonClass} onClick={() => { cancel(); setQuery(''); onChange(undefined); input.current?.focus(); }}>Use city pin instead</button>
      </div>
    </div>}
    <input ref={input} id={id} className={controlClass} type="search" maxLength={500} autoComplete="off" placeholder="Street number and street name" aria-describedby={`${id}-hint ${id}-search-hint`} value={query} onChange={(event) => { cancel(); setQuery(event.target.value); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void search(); } }} />
    <button type="button" className={buttonClass} disabled={busy || !query.trim()} onClick={() => { void search(); }}>{busy ? 'Finding address…' : 'Find address'}</button>
    <p id={`${id}-search-hint`} className="text-sm leading-relaxed text-muted">Search sends this address to Photon when you select Find address. Results use <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">© OpenStreetMap contributors</a>. Select a result, then Save and publish to update the map.</p>
    <p role="status" aria-live="polite" className="text-sm leading-relaxed">{status}</p>
    {results.length > 0 && <ul aria-label="Matching office addresses" className="divide-y divide-rule border border-rule">
      {results.map((office, index) => <li key={`${office.longitude}:${office.latitude}:${index}`}><button type="button" className="min-h-12 w-full break-words px-3 py-3 text-left text-base hover:bg-rule" onClick={() => { cancel(); setQuery(''); onChange(office); input.current?.focus(); }}>{office.address}<span className="mt-1 block font-mono text-xs text-muted">Use this address ↗</span></button></li>)}
    </ul>}
  </div>;
}
