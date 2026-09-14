import assert from 'node:assert/strict';
import test from 'node:test';

import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import StreetMap from '../../src/components/street-map';
import {
  buildStreetRoutes,
  fromMapCenter,
  nextMarkerIndex,
  toMapPosition,
} from '../../src/lib/street-map-data';
import {
  buildWorkJourney,
  interpolateJourneyLeg,
  type Coordinates,
  type JourneyExperience,
} from '../../src/lib/work-journey';

function role(company: string, startDate: string, coordinates?: Coordinates): JourneyExperience {
  return {
    company,
    title: 'Engineer',
    startDate,
    endDate: null,
    ...(coordinates
      ? { place: { longitude: coordinates[0], latitude: coordinates[1], countryCode: 'US' } }
      : {}),
  };
}

test('street/globe coordinates round-trip with longitude first and wrap repeated worlds', () => {
  for (const coordinates of [
    [-122.4, 37.8],
    [179.9, -45],
    [0, 0],
  ] satisfies Coordinates[]) {
    const [lat, lng] = toMapPosition(coordinates);
    const restored = fromMapCenter({ lat, lng });
    assert.ok(Math.abs(restored[0] - coordinates[0]) < 1e-10);
    assert.equal(restored[1], coordinates[1]);
  }
  assert.deepEqual(fromMapCenter({ lat: 12, lng: 550 }), [-170, 12]);
  assert.deepEqual(toMapPosition([-170, 10], 175), [10, 190]);
  assert.ok(toMapPosition([0, 90])[0] < 86, 'Mercator cannot display the pole.');
});

test('great-circle routes stay ordered and unwrap both antimeridian directions', () => {
  for (const endpoints of [
    [
      [170, 20],
      [-170, 30],
    ],
    [
      [-170, 30],
      [170, 20],
    ],
  ] satisfies [Coordinates, Coordinates][]) {
    const journey = buildWorkJourney([
      role('Earlier', '2020', endpoints[0]),
      role('Later', '2021', endpoints[1]),
    ]);
    const route = buildStreetRoutes(journey)[0]!;
    assert.equal(route.length, 97);
    assert.deepEqual(fromMapCenter({ lat: route[0]![0], lng: route[0]![1] }), endpoints[0]);
    const end = route.at(-1)!;
    assert.deepEqual(fromMapCenter({ lat: end[0], lng: end[1] }), endpoints[1]);
    for (let index = 1; index < route.length; index++)
      assert.ok(Math.abs(route[index]![1] - route[index - 1]![1]) < 180);
    const midpoint = interpolateJourneyLeg(journey.legs[0]!, 0.5);
    assert.ok(
      Math.abs(route[48]![0] - midpoint[1]) < 1e-10,
      'Sample the existing great circle, not a straight road route.',
    );
  }
});

test('unmapped roles stay unmapped and shared markers cycle every role', () => {
  const journey = buildWorkJourney([
    role('<img onerror=alert(1)>', '2020', [10, 20]),
    role('Shared', '2021', [10, 20]),
    { ...role('Remote', '2022'), location: 'London' },
    role('Last', '2023', [40, 50]),
  ]);
  assert.deepEqual(buildStreetRoutes(journey), []);
  assert.equal(journey.markers.length, 2);
  const marker = journey.markers[0]!;
  assert.equal(nextMarkerIndex(marker, undefined), 0);
  assert.equal(nextMarkerIndex(marker, 0), 1);
  assert.equal(nextMarkerIndex(marker, 1), 0);
});

test('SSR stays safe and a failed lazy import leaves retry and back available', async () => {
  const center: Coordinates = [-122, 38];
  const returned: Coordinates[] = [];
  const element = createElement(StreetMap, {
    journey: buildWorkJourney([]),
    selected: undefined,
    initialCenter: center,
    initialZoom: 7,
    onSelect: () => {},
    onBack: (value) => returned.push(value),
  });
  const html = renderToString(element);
  assert.match(html, /©.*OpenStreetMap/);
  assert.match(html, /Back to globe/);
  assert.doesNotMatch(html, /tile\.openstreetmap\.org/);
  const dom = new JSDOM('<div id="test"></div>', { pretendToBeVisual: true });
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  const host = dom.window.document.getElementById('test')!;
  const root = createRoot(host);
  try {
    // Node cannot import the lazy CSS asset; this exercises the real import-rejection path without fetching tiles.
    await act(async () => {
      root.render(element);
    });
    for (let attempt = 0; attempt < 20 && !host.textContent?.includes('Retry map'); attempt++) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }
    assert.match(host.textContent!, /couldn’t load/);
    const button = (label: string): HTMLButtonElement =>
      [...host.querySelectorAll('button')].find((item) => item.textContent === label)!;
    assert.ok(button('Retry map'));
    await act(async () => {
      button('Retry map').click();
    });
    assert.match(host.textContent!, /couldn’t load/);
    await act(async () => {
      button('Back to globe').click();
    });
    assert.deepEqual(returned, [center]);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
