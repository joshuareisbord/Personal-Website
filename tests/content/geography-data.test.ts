import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { geoOrthographic, geoPath } from 'd3-geo';
import { mesh } from 'topojson-client';
import type { Objects, Topology } from 'topojson-specification';

import { countriesSchema, locationsSchema } from '../../src/lib/locations';

test('committed geography includes usable world and regional outlines and every country lookup', async () => {
  const root = new URL('../../public/geography/', import.meta.url);
  const topology = JSON.parse(await readFile(new URL('boundaries.topo.json', root), 'utf8')) as Topology<Objects<Record<string, unknown>>>;
  assert.equal(topology.type, 'Topology');
  assert.ok(topology.objects.countries);
  assert.ok(topology.objects.admin1);
  const path = geoPath(geoOrthographic().rotate([100, -35]));
  const countries = mesh(topology, topology.objects.countries);
  const regions = mesh(topology, topology.objects.admin1);
  assert.ok(countries.coordinates.length > 100);
  assert.ok(regions.coordinates.length > 100);
  assert.ok((path(countries)?.length ?? 0) > 1000);
  assert.ok((path(regions)?.length ?? 0) > 1000);
  const catalog = countriesSchema.parse(JSON.parse(await readFile(new URL('countries.json', root), 'utf8')));
  assert.ok(catalog.length > 200);
  for (const country of catalog) {
    const data = locationsSchema.parse(JSON.parse(await readFile(new URL(`locations/${country.code}.json`, root), 'utf8')));
    assert.equal(new Set(data.cities.map((city) => city.id)).size, data.cities.length);
    if (country.code === 'CA') {
      assert.ok(data.regions.some((region) => region.code === 'ON'));
      assert.ok(data.cities.some((city) => city.name === 'Toronto' && city.longitude < -79 && city.latitude > 43));
    }
    if (country.code === 'US') {
      assert.ok(data.regions.some((region) => region.code === 'CA'));
      assert.ok(data.cities.some((city) => city.name === 'Los Angeles' && city.longitude < -118 && city.latitude > 34));
    }
  }
});
