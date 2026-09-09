import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { City, Country, State } from 'country-state-city';
import { geoArea, geoOrthographic, geoPath } from 'd3-geo';
import type { FeatureCollection, LineString, MultiLineString, MultiPolygon, Polygon, Position } from 'geojson';
import { feature, mesh, quantize } from 'topojson-client';
import { topology } from 'topojson-server';
import { presimplify, simplify, sphericalTriangleArea } from 'topojson-simplify';
import type { GeometryCollection, MultiLineString as TopoLines, Topology } from 'topojson-specification';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUTPUT = join(ROOT, 'public/geography');
const REVISION = 'f1890d9f152c896d250a77557a5751a93d494776';
const CACHE = process.env.GEOGRAPHY_SOURCE_DIR ?? join(tmpdir(), 'personal-website-geography');
const SOURCES = [
  { name: 'ne_10m_admin_0_countries.geojson', sha256: '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255' },
  { name: 'ne_10m_admin_1_states_provinces_lines.geojson', sha256: '1a1f30ccaaf4cc9c4bde34266f0b8cbb955d3a4cf254b756912255f2ec7c75b6' },
] as const;
const MIN_WEIGHT = 0.000002;
const QUANTIZATION = 1_000_000_000;
const require = createRequire(import.meta.url);
const args = new Set(process.argv.slice(2));
assert([...args].every((arg) => ['--check', '--offline', '--locations-only'].includes(arg)), 'Use --check, --offline, and/or --locations-only');

interface CountryOption { code: string; name: string }
interface CityOption {
  id: string;
  name: string;
  regionCode: string;
  latitude: number;
  longitude: number;
}
interface CountryLocations { regions: CountryOption[]; cities: CityOption[] }
interface SourceProperties { [key: string]: unknown }
interface CountryProperties { name: string; code: string | null }
type Boundaries = Topology<{ countries: GeometryCollection<CountryProperties>; admin1: TopoLines }>;
interface AssetRecord { bytes: number; gzipBytes: number; sha256: string }

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function packageRoot(name: string): string {
  let directory = dirname(require.resolve(name));
  while (directory !== dirname(directory)) {
    const path = join(directory, 'package.json');
    if (existsSync(path)) {
      const pkg = JSON.parse(readFileSync(path, 'utf8')) as { name?: string };
      if (pkg.name === name) return directory;
    }
    directory = dirname(directory);
  }
  throw new Error(`Cannot locate installed package: ${name}`);
}

async function packageVersion(name: string): Promise<string> {
  const pkg = JSON.parse(await readFile(join(packageRoot(name), 'package.json'), 'utf8')) as { version: string };
  return pkg.version;
}

async function source(source: typeof SOURCES[number]): Promise<Buffer> {
  const path = join(CACHE, source.name);
  let bytes: Buffer;
  try {
    bytes = await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    assert(!args.has('--offline'), `Offline source missing: ${path}`);
    const url = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${REVISION}/geojson/${source.name}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    assert(response.ok, `Natural Earth download failed: ${response.status} ${url}`);
    bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(sha256(bytes), source.sha256, `Source checksum mismatch: ${source.name}`);
    await mkdir(CACHE, { recursive: true });
    await writeFile(path, bytes);
  }
  assert.equal(sha256(bytes), source.sha256, `Source checksum mismatch: ${source.name}`);
  return bytes;
}

function coordinate(value: string | null | undefined, limit: number, label: string): number {
  assert(value !== undefined && value !== null && value.trim() !== '', `Missing coordinate: ${label}`);
  const parsed = Number(value);
  assert(Number.isFinite(parsed) && Math.abs(parsed) <= limit, `Invalid coordinate: ${label}`);
  return parsed;
}

function checkPositions(positions: Position[]): void {
  for (const point of positions) {
    assert(point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]));
    assert(Math.abs(point[0]!) <= 180.000001 && Math.abs(point[1]!) <= 90.000001);
  }
}

function segmentKeys(lines: Position[][]): Set<string> {
  const keys = new Set<string>();
  for (const line of lines) for (let index = 1; index < line.length; index++) {
    const a = line[index - 1]!.join(',');
    const b = line[index]!.join(',');
    if (a !== b) keys.add(a < b ? `${a}/${b}` : `${b}/${a}`);
  }
  return keys;
}

function normalizePolygon(rings: Position[][]): void {
  for (const [index, ring] of rings.entries()) {
    checkPositions(ring);
    assert(ring.length >= 4);
    assert.deepEqual(ring[0], ring.at(-1), 'Unclosed source polygon');
    const area = geoArea({ type: 'Polygon', coordinates: [ring] });
    // d3-geo requires clockwise exteriors and counterclockwise holes.
    if ((index === 0 && area > 2 * Math.PI) || (index > 0 && area < 2 * Math.PI)) ring.reverse();
  }
}

function protectClosedArcs(weighted: { arcs: number[][][] }): void {
  for (const arc of weighted.arcs) {
    const first = arc[0]!;
    const last = arc.at(-1)!;
    if (first[0] !== last[0] || first[1] !== last[1]) continue;
    // Keep tiny islands/enclaves: a closed arc needs three distinct vertices.
    const interior = arc.slice(1, -1).sort((a, b) => b[2]! - a[2]!);
    const seen = new Set([`${first[0]},${first[1]}`]);
    for (const point of interior) {
      const key = `${point[0]},${point[1]}`;
      if (seen.has(key)) continue;
      point[2] = Infinity;
      seen.add(key);
      if (seen.size >= 3) break;
    }
  }
}

function restoreCollapsedRings(weighted: Boundaries, candidate: Boundaries): boolean {
  let restored = false;
  const countries = feature(candidate, candidate.objects.countries);
  for (const [index, country] of countries.features.entries()) {
    const original = weighted.objects.countries.geometries[index]!;
    assert(country.geometry.type === 'Polygon' || country.geometry.type === 'MultiPolygon');
    assert(original.type === 'Polygon' || original.type === 'MultiPolygon');
    const polygons = country.geometry.type === 'Polygon' ? [country.geometry.coordinates] : country.geometry.coordinates;
    const rings = polygons.flatMap((polygon) => polygon.map((ring, index) => ({ ring, interior: index > 0 })));
    const references = original.type === 'Polygon' ? original.arcs : original.arcs.flat();
    for (const [ringIndex, { ring, interior }] of rings.entries()) {
      const area = geoArea({ type: 'Polygon', coordinates: [ring] });
      const validWinding = interior ? area > 2 * Math.PI : area > 0 && area < 2 * Math.PI;
      if (validWinding && new Set(ring.map((point) => `${point[0]},${point[1]}`)).size >= 3) continue;
      for (const reference of references[ringIndex]!) {
        for (const point of weighted.arcs[reference < 0 ? ~reference : reference]!) {
          if (point[2] !== Infinity) { point[2] = Infinity; restored = true; }
        }
      }
    }
  }
  const lines = feature(candidate, candidate.objects.admin1).geometry.coordinates;
  for (const [index, line] of lines.entries()) {
    if (new Set(line.map((point) => `${point[0]},${point[1]}`)).size >= 2) continue;
    for (const reference of weighted.objects.admin1.arcs[index]!) {
      for (const point of weighted.arcs[reference < 0 ? ~reference : reference]!) {
        if (point[2] !== Infinity) { point[2] = Infinity; restored = true; }
      }
    }
  }
  return restored;
}

function validateBoundaries(boundaries: Boundaries, expectedLines: number): void {
  const countries = feature(boundaries, boundaries.objects.countries);
  assert.equal(countries.features.length, 258, 'Every Natural Earth country must remain');
  const ids = new Set(countries.features.map((country) => country.id));
  assert.equal(ids.size, 258, 'Duplicate country identifiers');
  for (const country of countries.features) {
    assert(country.geometry.type === 'Polygon' || country.geometry.type === 'MultiPolygon');
    const polygons = country.geometry.type === 'Polygon' ? [country.geometry.coordinates] : country.geometry.coordinates;
    for (const rings of polygons) for (const ring of rings) {
      checkPositions(ring);
      assert.deepEqual(ring[0], ring.at(-1));
      assert(new Set(ring.map((point) => `${point[0]},${point[1]}`)).size >= 3, `Collapsed ring: ${country.id}`);
    }
    const area = geoArea(country);
    assert(area > 0 && area < 2 * Math.PI, `Invalid d3 winding/area: ${country.id}`);
  }
  const lines = feature(boundaries, boundaries.objects.admin1);
  assert.equal(lines.geometry.coordinates.length, expectedLines, 'Dropped admin-1 linework');
  for (const [index, line] of lines.geometry.coordinates.entries()) {
    checkPositions(line);
    assert(line.length >= 2);
    assert(new Set(line.map((point) => `${point[0]},${point[1]}`)).size >= 2, `Collapsed admin-1 line ${index}`);
  }
  const outlines = mesh(boundaries, boundaries.objects.countries);
  for (const rotation of [[100, -35], [-90, -20], [0, 0], [180, 0], [0, -90]] as [number, number][]) {
    const path = geoPath(geoOrthographic().rotate(rotation));
    for (const shape of [countries, outlines, lines]) {
      const svg = path(shape);
      assert(svg && !/NaN|Infinity/.test(svg), 'Invalid orthographic path');
    }
  }
}

async function prepareBoundaries(): Promise<{ boundaries: Boundaries; stats: object }> {
  const [countryBytes, adminBytes] = await Promise.all(SOURCES.map(source));
  const countries = JSON.parse(countryBytes!.toString()) as FeatureCollection<Polygon | MultiPolygon, SourceProperties>;
  const admin1 = JSON.parse(adminBytes!.toString()) as FeatureCollection<LineString | MultiLineString | null, SourceProperties>;
  assert.equal(countries.features.length, 258);
  assert.equal(admin1.features.length, 10_179);
  const cleaned: FeatureCollection<Polygon | MultiPolygon, CountryProperties> = {
    type: 'FeatureCollection',
    features: countries.features.map((country) => {
      assert(country.geometry.type === 'Polygon' || country.geometry.type === 'MultiPolygon');
      const polygons = country.geometry.type === 'Polygon' ? [country.geometry.coordinates] : country.geometry.coordinates;
      polygons.forEach(normalizePolygon);
      const code = String(country.properties.ISO_A2_EH);
      return {
        type: 'Feature' as const, id: String(country.properties.ADM0_A3), geometry: country.geometry,
        properties: { name: String(country.properties.NAME_EN), code: /^[A-Z]{2}$/.test(code) ? code : null },
      };
    }).sort((a, b) => compare(String(a.id), String(b.id))),
  };
  const lines: MultiLineString = { type: 'MultiLineString', coordinates: [] };
  const featuresByCountry: Record<string, number> = {};
  let nullFeatures = 0;
  let zeroLengthParts = 0;
  for (const entry of admin1.features) {
    if (!entry.geometry) { nullFeatures++; continue; }
    assert(entry.geometry.type === 'LineString' || entry.geometry.type === 'MultiLineString');
    const code = String(entry.properties.ADM0_A3);
    featuresByCountry[code] = (featuresByCountry[code] ?? 0) + 1;
    const parts = entry.geometry.type === 'LineString' ? [entry.geometry.coordinates] : entry.geometry.coordinates;
    for (const part of parts) {
      checkPositions(part);
      assert(part.length >= 2);
      if (new Set(part.map((point) => `${point[0]},${point[1]}`)).size < 2) { zeroLengthParts++; continue; }
      lines.coordinates.push(part);
    }
  }
  assert.equal(nullFeatures, 1, 'Unexpected source null geometry count');
  assert.equal(featuresByCountry.USA, 153);
  assert.equal(featuresByCountry.CAN, 31);
  assert.equal(zeroLengthParts, 33, 'Unexpected zero-length source geometry count');
  const lineTopology = topology({ admin1: lines }) as Topology<{ admin1: TopoLines }>;
  const stitchedLines = mesh(lineTopology, lineTopology.objects.admin1);
  const meshZeroLengthParts = stitchedLines.coordinates.filter((line) => new Set(line.map((point) => `${point[0]},${point[1]}`)).size < 2).length;
  stitchedLines.coordinates = stitchedLines.coordinates.filter((line) => new Set(line.map((point) => `${point[0]},${point[1]}`)).size >= 2);
  const sourceSegments = segmentKeys(lines.coordinates);
  const stitchedSegments = segmentKeys(stitchedLines.coordinates);
  assert.equal(sourceSegments.size, stitchedSegments.size, 'Stitching changed drawable segment count');
  assert([...sourceSegments].every((segment) => stitchedSegments.has(segment)), 'Stitching dropped source linework');
  const original = topology({ countries: cleaned, admin1: stitchedLines }) as Boundaries;
  const weighted = presimplify(original, sphericalTriangleArea);
  protectClosedArcs(weighted);
  let boundaries = quantize(simplify(weighted, MIN_WEIGHT), QUANTIZATION) as Boundaries;
  while (restoreCollapsedRings(weighted as Boundaries, boundaries)) {
    boundaries = quantize(simplify(weighted, MIN_WEIGHT), QUANTIZATION) as Boundaries;
  }
  validateBoundaries(boundaries, stitchedLines.coordinates.length);
  return {
    boundaries,
    stats: {
      countries: cleaned.features.length, admin1SourceFeatures: admin1.features.length,
      admin1NullGeometries: nullFeatures, admin1ZeroLengthParts: zeroLengthParts,
      admin1MeshZeroLengthParts: meshZeroLengthParts, admin1UniqueSourceSegments: sourceSegments.size,
      admin1SourceLineParts: lines.coordinates.length + zeroLengthParts, admin1LineParts: stitchedLines.coordinates.length,
      admin1FeaturesByCountry: Object.fromEntries(Object.entries(featuresByCountry).sort(([a], [b]) => compare(a, b))),
      sourceVertices: original.arcs.reduce((sum, arc) => sum + arc.length, 0),
      simplifiedVertices: boundaries.arcs.reduce((sum, arc) => sum + arc.length, 0),
      sphericalTriangleMinWeight: MIN_WEIGHT, quantization: QUANTIZATION,
    },
  };
}

function prepareLocations(): { countries: CountryOption[]; locations: Map<string, CountryLocations>; stats: object } {
  const countries = Country.getAllCountries().map(({ isoCode: code, name }) => ({ code, name }))
    .sort((a, b) => compare(a.name, b.name) || compare(a.code, b.code));
  assert.equal(countries.length, 250);
  const locations = new Map<string, CountryLocations>();
  for (const country of countries) {
    assert(/^[A-Z]{2}$/.test(country.code), `Invalid country code: ${country.code}`);
    assert(!locations.has(country.code));
    locations.set(country.code, { regions: [], cities: [] });
  }
  for (const region of State.getAllStates()) {
    const target = locations.get(region.countryCode);
    assert(target, `Orphan region: ${region.countryCode}/${region.isoCode}`);
    assert(!target.regions.some((other) => other.code === region.isoCode), 'Duplicate region code');
    target.regions.push({ code: region.isoCode, name: region.name });
  }
  const ids = new Map<string, string>();
  let duplicates = 0;
  for (const city of City.getAllCities()) {
    const target = locations.get(city.countryCode);
    assert(target && target.regions.some((region) => region.code === city.stateCode), `Orphan city: ${city.name}`);
    const latitude = coordinate(city.latitude, 90, city.name);
    const longitude = coordinate(city.longitude, 180, city.name);
    const identity = JSON.stringify([city.countryCode, city.stateCode, city.name, latitude, longitude]);
    const id = `${city.countryCode}:${city.stateCode}:${sha256(identity).slice(0, 20)}`;
    const previous = ids.get(id);
    if (previous) { assert.equal(previous, identity, 'City ID hash collision'); duplicates++; continue; }
    ids.set(id, identity);
    target.cities.push({ id, name: city.name, regionCode: city.stateCode, latitude, longitude });
  }
  let regions = 0;
  let regionsWithoutCities = 0;
  let countriesWithoutCities = 0;
  for (const data of locations.values()) {
    data.regions.sort((a, b) => compare(a.name, b.name) || compare(a.code, b.code));
    data.cities.sort((a, b) => compare(a.name, b.name) || compare(a.regionCode, b.regionCode) || compare(a.id, b.id));
    regions += data.regions.length;
    const populated = new Set(data.cities.map((city) => city.regionCode));
    regionsWithoutCities += data.regions.filter((region) => !populated.has(region.code)).length;
    if (!data.cities.length) countriesWithoutCities++;
  }
  assert.equal(regions, 4963);
  assert.equal(ids.size + duplicates, 148_038);
  for (const code of ['AK', 'HI', 'CA', 'NY', 'DC']) assert(locations.get('US')!.regions.some((region) => region.code === code));
  assert.equal(locations.get('CA')!.regions.length, 13);
  return { countries, locations, stats: { countries: countries.length, regions, cities: ids.size, exactDuplicateCities: duplicates, regionsWithoutCities, countriesWithoutCities } };
}

async function main(): Promise<void> {
  assert.equal(await packageVersion('country-state-city'), '3.2.1', 'Review data changes before changing the pinned package version');
  const { countries, locations, stats: locationStats } = prepareLocations();
  const output = new Map<string, Buffer>();
  const json = (name: string, value: unknown): void => { output.set(name, Buffer.from(`${JSON.stringify(value)}\n`)); };
  json('countries.json', countries);
  for (const [code, data] of locations) json(`locations/${code}.json`, data);
  if (args.has('--locations-only')) {
    for (const [name, bytes] of output) {
      const path = join(OUTPUT, name);
      if (args.has('--check')) assert.deepEqual(await readFile(path), bytes, `Generated asset is stale: ${name}`);
      else { await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes); }
    }
    console.log(JSON.stringify({ mode: args.has('--check') ? 'verified' : 'generated', locations: locationStats }, null, 2));
    return;
  }
  const { boundaries, stats: boundaryStats } = await prepareBoundaries();
  json('boundaries.topo.json', boundaries);
  const boundaryBytes = output.get('boundaries.topo.json')!;
  console.log(`Boundary payload: ${boundaryBytes.length} bytes, ${gzipSync(boundaryBytes, { level: 9 }).length} bytes gzip`);
  assert(gzipSync(boundaryBytes, { level: 9 }).length <= 1_000_000, 'Compressed boundary payload exceeds budget');
  output.set('LICENSE.country-state-city.txt', await readFile(join(packageRoot('country-state-city'), 'LICENSE')));
  output.set('ATTRIBUTION.md', Buffer.from(
    '# Geography data attribution\n\nMade with Natural Earth.\n\n' +
    'Natural Earth vector data is public domain: https://www.naturalearthdata.com/about/terms-of-use/\n' +
    `Natural Earth v5.1.2 repository revision: ${REVISION}.\n` +
    'Country/coast polygons and all available admin-1 lines are simplified derivatives.\n\n' +
    'Country, state, and city data: country-state-city 3.2.1, by Harpreet Singh and contributors.\n' +
    'https://github.com/harpreetkhalsagtbit/country-state-city\n' +
    'The package declares GPL-3.0; its unmodified license is LICENSE.country-state-city.txt.\n' +
    'Its credited upstream data source is https://github.com/dr5hn/countries-states-cities-database.\n' +
    'The selector JSON is a transformed extract of the installed package: fields selected, coordinates converted to numbers, records sorted, and stable city IDs added.\n' +
    'See docs/geography.md and scripts/prepare-geography.ts in this repository for the complete transformation and reproduction instructions.\n',
  ));
  const artifacts: Record<string, AssetRecord> = {};
  for (const [name, bytes] of [...output].sort(([a], [b]) => compare(a, b))) {
    artifacts[name] = { bytes: bytes.length, gzipBytes: gzipSync(bytes, { level: 9 }).length, sha256: sha256(bytes) };
  }
  const versions: Record<string, string> = {};
  for (const name of ['country-state-city', 'd3-geo', 'topojson-client', 'topojson-server', 'topojson-simplify']) versions[name] = await packageVersion(name);
  const dataHashes: Record<string, string> = {};
  for (const name of ['country', 'state', 'city']) {
    dataHashes[`${name}.json`] = sha256(await readFile(join(packageRoot('country-state-city'), `lib/assets/${name}.json`)));
  }
  json('manifest.json', {
    schemaVersion: 1, naturalEarth: { tag: 'v5.1.2', revision: REVISION, sources: SOURCES },
    packages: versions, countryStateCitySourceSha256: dataHashes, boundaries: boundaryStats,
    locations: locationStats, artifacts,
  });
  for (const [name, bytes] of output) {
    const path = join(OUTPUT, name);
    if (args.has('--check')) assert.deepEqual(await readFile(path), bytes, `Generated asset is stale: ${name}`);
    else { await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes); }
  }
  console.log(JSON.stringify({ mode: args.has('--check') ? 'verified' : 'generated', files: output.size, boundaries: artifacts['boundaries.topo.json'], countries: artifacts['countries.json'], locations: locationStats }, null, 2));
}

await main();
