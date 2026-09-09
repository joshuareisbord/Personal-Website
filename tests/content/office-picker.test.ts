import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';

import { JSDOM } from 'jsdom';
import { act, createElement, useState, type ReactElement } from 'react';

import { LocationPicker } from '../../src/components/location-picker';
import { parseOfficeResults } from '../../src/lib/office-search';
import type { WorkOffice, WorkPlace } from '../../src/lib/profile';

const cityLabel = 'Kingston, Ontario, Canada';
const city: WorkPlace = { city: 'Kingston', regionCode: 'ON', countryCode: 'CA', latitude: 44.2312, longitude: -76.486 };
const savedOffice: WorkOffice = { address: '81 Existing Street, Kingston', latitude: 44.232, longitude: -76.487 };
let searchClock = Date.now();

function feature(housenumber = '125', properties: Record<string, unknown> = {}) {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [-76.49, 44.24] },
    properties: { housenumber, street: 'Princess Street', city: 'Kingston', state: 'Ontario', postcode: 'K7L 1A1', country: 'Canada', countrycode: 'ca', ...properties } };
}

test('Photon parser returns longitude/latitude correctly and excludes incomplete addresses and other countries', () => {
  assert.deepEqual(parseOfficeResults({ features: [feature(' 125 ', { name: ' Office ' }),
    feature('20', { countrycode: 'US' }), feature('21', { street: undefined }), feature('22', { housenumber: undefined })] }, 'CA'), [
    { address: 'Office, 125 Princess Street, Kingston, Ontario, K7L 1A1, Canada', latitude: 44.24, longitude: -76.49 },
  ]);
  assert.deepEqual(parseOfficeResults({ features: [feature('9', { city: undefined, district: 'Old Town', state: undefined, postcode: undefined, country: undefined })] }, 'CA'), [
    { address: '9 Princess Street, Old Town', latitude: 44.24, longitude: -76.49 },
  ]);
  assert.deepEqual(parseOfficeResults({ features: [] }, 'CA'), []);
});

test('Photon parser rejects malformed geometry, invalid coordinates, and unbounded response data', () => {
  for (const geometry of [null, { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
    ...[[181, 0], [-181, 0], [0, 91], [0, -91], [NaN, 0], [0, Infinity], ['-76', 44], [0], [0, 0, 0]].map((coordinates) => ({ type: 'Point', coordinates }))]) {
    assert.throws(() => parseOfficeResults({ features: [{ ...feature(), geometry }] }, 'CA'));
  }
  for (const payload of [null, {}, { features: 'wrong' }, { features: [feature('1', { countrycode: undefined })] },
    { features: [feature('1', { street: 'x'.repeat(501) })] }, { features: Array.from({ length: 51 }, () => feature()) }]) {
    assert.throws(() => parseOfficeResults(payload, 'CA'));
  }
});

test('Photon parser limits suggestions and omits assembled addresses over the publication limit', () => {
  const results = parseOfficeResults({ features: [feature('1', { name: 'n'.repeat(300), street: 's'.repeat(300) }),
    ...Array.from({ length: 8 }, (_, index) => feature(String(index + 10)))] }, 'CA');
  assert.equal(results.length, 6);
  assert.ok(results.every((result) => result.address.length <= 500));
  assert.match(results[0]!.address, /^10 Princess Street/);
  assert.match(results[5]!.address, /^15 Princess Street/);
});

interface PendingSearch {
  url: URL;
  options: RequestInit | undefined;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
}

async function mountPicker(context: TestContext) {
  const dom = new JSDOM('<div id="test"></div>', { pretendToBeVisual: true });
  const searches: PendingSearch[] = [];
  const changes: { location: string | undefined; place: WorkPlace | undefined }[] = [];
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const fetchMock: typeof fetch = (input, options) => new Promise<Response>((resolve, reject) => {
    searches.push({ url: new URL(input instanceof Request ? input.url : String(input)), options, resolve, reject });
  });
  // Advance the real search throttle deterministically; each test uses distinct query/cache keys.
  context.mock.method(Date, 'now', () => searchClock);
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true, fetch: fetchMock })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  const { createRoot } = await import('react-dom/client');
  const host = dom.window.document.getElementById('test')!;
  const root = createRoot(host);
  let mounted = true;
  let submissions = 0;
  function Harness(): ReactElement {
    const [value, setValue] = useState<{ location: string | undefined; place: WorkPlace | undefined }>({ location: cityLabel, place: { ...city, office: savedOffice } });
    return createElement('form', { onSubmit: (event) => { event.preventDefault(); submissions++; } },
      createElement(LocationPicker, { ...value, onChange: (location, place) => {
        const next = { location, place }; changes.push(next); setValue(next);
      } }));
  }
  const unmount = async (): Promise<void> => {
    if (mounted) { await act(async () => root.unmount()); mounted = false; }
  };
  context.after(async () => {
    await unmount();
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  await act(async () => { root.render(createElement(Harness)); });
  const input = (): HTMLInputElement => {
    const field = host.querySelector<HTMLInputElement>('input[type="search"]');
    assert.ok(field); return field;
  };
  const button = (label: string): HTMLButtonElement => {
    const found = [...host.querySelectorAll('button')].find((element) => element.textContent?.trim() === label);
    assert.ok(found, `Missing button: ${label}`); return found;
  };
  const type = async (value: string): Promise<void> => {
    await act(async () => {
      const field = input();
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(field, value);
      field.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
  };
  const click = async (label: string): Promise<void> => { await act(async () => button(label).click()); };
  const search = async (withEnter = false): Promise<void> => {
    searchClock += 2_000;
    await act(async () => {
      if (withEnter) input().dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      else button('Find address').click();
    });
  };
  const respond = async (index: number, payload: unknown, status = 200): Promise<void> => {
    assert.ok(searches[index], `Missing search ${index}`);
    await act(async () => { searches[index]!.resolve(new Response(JSON.stringify(payload), { status })); });
  };
  return { host, dom, searches, changes, input, button, type, click, search, respond, unmount, submissions: () => submissions };
}

test('typing never looks up addresses; explicit search and result selection preserve the city, and removal restores its pin', async (context) => {
  const view = await mountPicker(context);
  assert.equal(view.searches.length, 0);
  assert.equal(view.button('Find address').disabled, true);
  for (const query of ['1', '125', '125 Princess Street']) await view.type(query);
  assert.equal(view.searches.length, 0, 'No Photon or city-data fetch occurs while typing.');
  assert.equal(view.changes.length, 0);
  await view.search();
  assert.equal(view.searches.length, 1);
  const request = view.searches[0]!;
  assert.equal(request.url.origin, 'https://photon.komoot.io');
  assert.equal(request.url.pathname, '/api/');
  assert.equal(request.url.searchParams.get('q'), `125 Princess Street, ${cityLabel}`);
  assert.equal(request.url.searchParams.get('countrycode'), 'CA');
  assert.equal(request.url.searchParams.get('lat'), String(city.latitude));
  assert.equal(request.url.searchParams.get('lon'), String(city.longitude));
  assert.equal(request.options?.credentials, 'omit');
  assert.equal(request.options?.signal?.aborted, false);
  await view.respond(0, { features: [feature()] });
  assert.equal(view.changes.length, 0, 'Search results alone must not replace a saved office.');
  assert.ok(view.host.textContent?.includes(savedOffice.address));
  const result = view.host.querySelector<HTMLButtonElement>('[aria-label="Matching office addresses"] button');
  assert.ok(result);
  await act(async () => result.click());
  assert.deepEqual([...view.changes], [{ location: cityLabel, place: { ...city, office: {
    address: '125 Princess Street, Kingston, Ontario, K7L 1A1, Canada', longitude: -76.49, latitude: 44.24,
  } } }]);
  assert.equal(view.input().value, '');
  assert.equal(view.host.querySelector('[aria-expanded="false"] span')?.textContent, cityLabel);
  await view.click('Use city pin instead');
  assert.deepEqual(view.changes[1], { location: cityLabel, place: city });
  assert.equal(Object.hasOwn(view.changes[1]!.place!, 'office'), false);
  assert.equal(view.host.querySelector('[aria-label="Matching office addresses"]'), null);
  assert.equal(view.searches.length, 1);
  assert.equal(view.submissions(), 0);
});

test('HTTP errors, network errors, and no results retain the saved office and permit another explicit search', async (context) => {
  const view = await mountPicker(context);
  await view.type('503 Unavailable Street'); await view.search();
  await view.respond(0, {}, 503);
  assert.match(view.host.querySelector('[role="status"]')!.textContent!, /unavailable/i);
  assert.ok(view.host.textContent?.includes(savedOffice.address));
  await view.type('504 Offline Street'); await view.search();
  await act(async () => view.searches[1]!.reject(new Error('Network offline')));
  assert.match(view.host.querySelector('[role="status"]')!.textContent!, /offline/i);
  assert.ok(view.host.textContent?.includes(savedOffice.address));
  await view.type('505 No Match Street'); await view.search(true);
  await view.respond(2, { features: [] });
  assert.match(view.host.querySelector('[role="status"]')!.textContent!, /No numbered street address/);
  assert.ok(view.host.textContent?.includes(savedOffice.address));
  assert.equal(view.button('Find address').disabled, false);
  assert.equal(view.host.querySelector('[aria-label="Matching office addresses"]'), null);
  assert.deepEqual(view.changes, []);
  assert.equal(view.submissions(), 0, 'Enter searches without submitting the editor form.');
});

test('query edits abort stale searches and late responses cannot replace newer results', async (context) => {
  const view = await mountPicker(context);
  await view.type('601 Old Query'); await view.search();
  await view.type('602 Current Query');
  assert.equal(view.searches[0]!.options?.signal?.aborted, true);
  assert.equal(view.searches.length, 1, 'Editing cancels without starting another lookup.');
  await view.search();
  await view.respond(1, { features: [feature('602')] });
  const currentResults = view.host.querySelector('[aria-label="Matching office addresses"]')!.textContent;
  const currentStatus = view.host.querySelector('[role="status"]')!.textContent;
  // Deliberately deliver an aborted request anyway: fetch cancellation alone is not sufficient.
  await view.respond(0, { features: [feature('601')] });
  assert.equal(view.host.querySelector('[aria-label="Matching office addresses"]')!.textContent, currentResults);
  assert.equal(view.host.querySelector('[role="status"]')!.textContent, currentStatus);
  assert.deepEqual(view.changes, []);
});

test('stale failures cannot overwrite a new search, and unmount cancels pending work', async (context) => {
  const view = await mountPicker(context);
  await view.type('701 Old Failure'); await view.search();
  await view.type('702 Pending Current'); await view.search();
  await act(async () => view.searches[0]!.reject(new Error('Stale server failure')));
  assert.equal(view.button('Finding address…').disabled, true);
  assert.doesNotMatch(view.host.textContent!, /Stale server failure/);
  await view.unmount();
  assert.equal(view.searches[1]!.options?.signal?.aborted, true);
  await view.respond(1, { features: [feature('702')] });
  assert.equal(view.host.childElementCount, 0);
  assert.deepEqual(view.changes, []);
});
