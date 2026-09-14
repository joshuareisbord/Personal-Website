import assert from 'node:assert/strict';
import test from 'node:test';

import {
  locationsSchema,
  searchCities,
  selectCity,
  type LocationData,
} from '../../src/lib/locations';

const data: LocationData = {
  regions: [
    { code: 'ON', name: 'Ontario' },
    { code: 'QC', name: 'Quebec' },
    { code: 'NU', name: 'Nunavut' },
  ],
  cities: [
    { id: 'CA:QC:1', name: 'Montréal', regionCode: 'QC', latitude: 45.5019, longitude: -73.5674 },
    { id: 'CA:ON:2', name: 'Kingston', regionCode: 'ON', latitude: 44.2312, longitude: -76.486 },
    { id: 'CA:QC:3', name: 'Kingston', regionCode: 'QC', latitude: 45, longitude: -74 },
  ],
};

test('city search handles accents, disambiguates regions, and never invents matches', () => {
  assert.equal(searchCities(data, ' Montreal ', '')[0]?.name, 'Montréal');
  assert.equal(searchCities(data, 'kingston', 'ON')[0]?.id, 'CA:ON:2');
  assert.equal(searchCities(data, 'kingston', '').length, 2);
  assert.deepEqual(searchCities(data, 'kingston', 'NU'), []);
  assert.deepEqual(searchCities(data, 'Remote', ''), []);
  assert.deepEqual(searchCities(data, '', ''), []);
});

test('selection pairs the exact city coordinates with its full location label', () => {
  assert.deepEqual(selectCity({ code: 'CA', name: 'Canada' }, data, data.cities[0]!), {
    location: 'Montréal, Quebec, Canada',
    place: {
      latitude: 45.5019,
      longitude: -73.5674,
      countryCode: 'CA',
      regionCode: 'QC',
      city: 'Montréal',
    },
  });
  assert.throws(() =>
    locationsSchema.parse({ ...data, cities: [{ ...data.cities[0], latitude: 100 }] }),
  );
  assert.throws(() => locationsSchema.parse({ regions: [], cities: [{ name: 'City' }] }));
});
