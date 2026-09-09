import assert from 'node:assert/strict';
import test from 'node:test';

import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import { ExperienceGlobe } from '../../src/components/experience-globe';
import { buildWorkJourney, interpolateJourneyLeg, type JourneyExperience } from '../../src/lib/work-journey';

function role(company: string, startDate: string, longitude?: number, latitude = 0): JourneyExperience {
  return { company, title: 'Engineer', startDate, endDate: null,
    ...(longitude === undefined ? {} : { place: { longitude, latitude, countryCode: 'US' } }) };
}

test('journey sorts a copy by start date and flows from the earliest role to the latest', () => {
  const experience = [role('Latest', '2024', 60), role('First', '2019-06', 0), role('Middle', '2021', 30)];
  const journey = buildWorkJourney(experience);
  assert.deepEqual(experience.map((job) => job.company), ['Latest', 'First', 'Middle']);
  assert.deepEqual(journey.stops.map((stop) => stop.role.company), ['First', 'Middle', 'Latest']);
  assert.deepEqual(journey.legs.map((leg) => [leg.from.role.company, leg.to.role.company]), [['First', 'Middle'], ['Middle', 'Latest']]);
  const leg = journey.legs[0]!;
  assert.deepEqual(interpolateJourneyLeg(leg, 0), [0, 0]);
  assert.deepEqual(interpolateJourneyLeg(leg, 1), [30, 0]);
  assert.ok(Math.abs(interpolateJourneyLeg(leg, 0.5)[0] - 15) < 0.001);
});

test('unknown or invalid coordinates break routes without guessing from location text', () => {
  const journey = buildWorkJourney([
    role('First', '2019', 0), { ...role('Remote', '2020'), location: 'New York' },
    role('Third', '2021', 30), role('Invalid latitude', '2022', 40, 91),
    role('Fifth', '2023', 50), role('Invalid longitude', '2024', Infinity),
    role('Seventh', '2025', 60),
  ]);
  assert.equal(journey.legs.length, 0);
  assert.equal(journey.markers.length, 4);
  assert.equal(journey.unmappedCount, 3);
  assert.equal(buildWorkJourney([role('Bad', '2020', 181)]).markers.length, 0);
  assert.equal(buildWorkJourney([role('Bad', '2020', 10, NaN)]).markers.length, 0);
});

test('co-located roles retain every selectable job and omit zero-length travel', () => {
  const journey = buildWorkJourney([role('A', '2020', 10, 20), role('B', '2021', 10, 20), role('C', '2022', 30, 20)]);
  assert.equal(journey.markers.length, 2);
  assert.deepEqual(journey.markers[0]!.stops.map((stop) => stop.role.company), ['A', 'B']);
  assert.deepEqual(journey.legs.map((leg) => [leg.from.role.company, leg.to.role.company]), [['B', 'C']]);
  assert.equal(buildWorkJourney([role('A', '2020', 180), role('B', '2021', -180)]).markers.length, 1);
  assert.equal(buildWorkJourney([role('A', '2020', 0, 90), role('B', '2021', 120, 90)]).markers.length, 1);
});

test('antimeridian travel takes the short great-circle arc; antipodes have no invented route', () => {
  const journey = buildWorkJourney([role('A', '2020', 170), role('B', '2021', -170)]);
  const halfway = interpolateJourneyLeg(journey.legs[0]!, 0.5);
  assert.ok(Math.abs(Math.abs(halfway[0]) - 180) < 0.001);
  assert.ok(Math.abs(halfway[1]) < 0.001);
  const antipodes = buildWorkJourney([role('A', '2020', 0), role('B', '2021', 180)]);
  assert.equal(antipodes.legs.length, 0);
  assert.equal(antipodes.ambiguousCount, 1);
  const near = buildWorkJourney([role('A', '2020', 0), role('B', '2021', 179.99, 0.01)]);
  for (let step = 0; step <= 100; step++) assert.ok(interpolateJourneyLeg(near.legs[0]!, step / 100).every(Number.isFinite));
});

test('equal start dates do not imply direction; invalid chronology does not fabricate a sequence', () => {
  const tied = buildWorkJourney([role('A', '2020', 0), role('B', '2020-01', 20)]);
  assert.equal(tied.legs.length, 0);
  assert.equal(tied.ambiguousCount, 1);
  const tiedRoles = [role('Before', '2019', -20), role('A', '2020', 0), role('B', '2020-01', 20), role('After', '2021', 40)];
  assert.equal(buildWorkJourney(tiedRoles).legs.length, 0, 'Do not pick arbitrary arrival or departure roles around tied dates.');
  assert.equal(buildWorkJourney([...tiedRoles].reverse()).legs.length, 0);
  assert.equal(buildWorkJourney([role('Before', '2019', -20), role('Unknown month', '2020', 0), role('Known month', '2020-07', 20), role('After', '2021', 40)]).legs.length, 0,
    'A year-only date must not be assumed to precede a known month in that year.');
  const invalid = buildWorkJourney([role('A', '2019', 0), role('B', 'unknown', 10), role('C', '2021', 30)]);
  assert.equal(invalid.legs.length, 0);
  assert.equal(invalid.markers.length, 3);
  assert.equal(invalid.hasInvalidDates, true);
  assert.deepEqual(buildWorkJourney([]).stops, []);
});

test('globe hydrates without eager fetching, retries map errors, selects shared roles, and respects motion preferences', async () => {
  const experience = [role('First', '2020-02', 0), role('Shared', '2021-03', 0), role('Latest', '2022-04', 30)];
  const element = createElement(ExperienceGlobe, { experience });
  const html = renderToString(element);
  assert.match(html, /February, 2020/);
  const dom = new JSDOM(`<div id="test">${html}</div>`, { pretendToBeVisual: true });
  const { window } = dom;
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  const observers: { callback: IntersectionObserverCallback; target?: Element }[] = [];
  class MockObserver {
    entry: { callback: IntersectionObserverCallback; target?: Element };
    constructor(callback: IntersectionObserverCallback) { this.entry = { callback }; observers.push(this.entry); }
    observe(target: Element): void { this.entry.target = target; }
    disconnect(): void { /* The test dispatches visibility explicitly. */ }
  }
  let fetches = 0;
  const geography = { type: 'Topology', arcs: [[[0, 0], [0, 10], [10, 0], [0, 0]]], objects: {
    countries: { type: 'GeometryCollection', geometries: [{ type: 'Polygon', arcs: [[0]] }] },
    admin1: { type: 'MultiLineString', arcs: [[0]] },
  } };
  for (const [key, value] of Object.entries({ window, document: window.document, IntersectionObserver: MockObserver,
    IS_REACT_ACT_ENVIRONMENT: true, fetch: async () => {
      fetches++;
      if (fetches === 1) throw new Error('Offline');
      return new Response(JSON.stringify(geography), { status: 200 });
    } })) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  Object.defineProperty(window, 'IntersectionObserver', { value: MockObserver });
  let reduced = false;
  const preference = new window.EventTarget();
  Object.defineProperty(preference, 'matches', { get: () => reduced });
  Object.defineProperty(window, 'matchMedia', { value: () => preference });
  let now = 0;
  let sequence = 0;
  const frames = new Map<number, FrameRequestCallback>();
  window.requestAnimationFrame = (callback) => { frames.set(++sequence, callback); return sequence; };
  window.cancelAnimationFrame = (id) => { frames.delete(id); };
  const host = window.document.getElementById('test')!;
  const svg = host.querySelector('svg')!;
  let visible = true;
  svg.getBoundingClientRect = () => ({ top: visible ? 10 : -510, bottom: visible ? 510 : -10, width: 500, height: 500, x: 0, y: 10, left: 0, right: 500, toJSON: () => ({}) });
  const lines = (): string | null => host.querySelector('svg > g[fill="none"] > path')!.getAttribute('d');
  const button = (label: string): HTMLButtonElement => [...host.querySelectorAll('button')].find((item) => item.getAttribute('aria-label') === label || item.textContent === label)!;
  const advance = async (): Promise<void> => {
    await act(async () => { now += 60; const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback(now)); });
  };
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => { root = hydrateRoot(host, element); });
    assert.equal(fetches, 0, 'Loading waits until the outer frame is near the viewport.');
    const initial = lines();
    await advance(); await advance();
    assert.notEqual(lines(), initial, 'Idle rotation changes the projection.');
    await act(async () => {
      const observer = observers.find((entry) => entry.target?.tagName === 'DIV')!;
      observer.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    assert.equal(fetches, 1);
    assert.match(host.textContent!, /Map couldn’t load/);
    assert.equal(host.querySelectorAll('option').length, 3, 'Map failure leaves every role selectable.');
    await act(async () => button('Retry map').click());
    assert.equal(fetches, 2);
    assert.doesNotMatch(host.textContent!, /couldn’t load/);
    const select = host.querySelector('select')!;
    await act(async () => { select.value = '1'; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
    assert.match(host.querySelector('[aria-atomic="true"]')!.textContent!, /Shared.*March, 2021/);
    assert.equal(frames.size, 0, 'Selecting a role pauses the camera.');
    await act(async () => button('Resume globe animation').click());
    assert.equal(frames.size, 1);
    await act(async () => { visible = false; window.dispatchEvent(new window.Event('scroll')); });
    assert.equal(frames.size, 0);
    await act(async () => { visible = true; window.dispatchEvent(new window.Event('scroll')); });
    assert.equal(frames.size, 1);
    await act(async () => {
      Object.defineProperty(window.document, 'hidden', { value: true, configurable: true });
      window.document.dispatchEvent(new window.Event('visibilitychange'));
    });
    assert.equal(frames.size, 0);
    await act(async () => {
      Object.defineProperty(window.document, 'hidden', { value: false, configurable: true });
      window.document.dispatchEvent(new window.Event('visibilitychange'));
      reduced = true; preference.dispatchEvent(new window.Event('change'));
    });
    assert.equal(frames.size, 0);
    const beforeManual = lines();
    await act(async () => button('Rotate globe right').click());
    assert.notEqual(lines(), beforeManual, 'Reduced motion still permits manual rotation.');
    assert.equal(frames.size, 0);
    const beforeZoom = host.querySelector('svg > path')!.getAttribute('d');
    await act(async () => button('Zoom in').click());
    assert.notEqual(host.querySelector('svg > path')!.getAttribute('d'), beforeZoom);
    await act(async () => button('Reset').click());
    assert.equal(host.querySelector('svg > path')!.getAttribute('d'), beforeZoom);
    await act(async () => { root?.unmount(); root = undefined; });
    assert.equal(frames.size, 0);
  } finally {
    if (root) await act(async () => root?.unmount());
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
