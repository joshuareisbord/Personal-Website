# Geography and street maps

The wireframe globe uses local TopoJSON. The editor loads a small country index and then only the selected country's location file. These views require no geocoding service, API key, CDN dependency, or runtime import of `country-state-city`. The committed geography works without external network access; a browser must still obtain the files from the site's own origin. This does not add a service worker or promise disconnected browsing before assets have been downloaded.

## Street-level exploration

Keep pressing **Zoom in** beyond the globe's regional view to open a detailed map in the same panel. **Street level** jumps directly to the selected role's office pin, or city when no office is supplied. The detailed view uses npm-managed Leaflet and OpenStreetMap raster tiles, with monochrome styling, visible attribution, and zoom up to level 19. Use the zoom controls, keyboard +/−, double-click, or pinch; ordinary mouse-wheel scrolling continues scrolling the webpage. **Back to globe**, or zooming out to world scale, returns to the wireframe view at the current map center.

The mapping library and street tiles load only after explicit interaction. Street tiles require internet access and use [OpenStreetMap's standard tile service](https://operations.osmfoundation.org/policies/tiles/), whose availability is best-effort. Browser requests use HTTPS and normal Referer/cache behavior. There is no tile proxy, background prefetch, bulk download, or offline archive. Attribution remains outside the map as well as in its controls. Automated zoom tests intercept tiles with local fixtures rather than requesting many zoom levels from the community service.

Work markers use owner-selected office coordinates when provided and city coordinates otherwise. Connections show the chronology of roles along great-circle paths; they are not street directions. Co-located roles stay individually selectable, and unknown locations are never inferred. The wireframe globe and role details remain usable if the street library or tile service is unavailable.

## Optional office addresses

In the owner editor, choose a city, then enter a street number and street name under **Office address**. Select **Find address**, review the matching numbered addresses, and select the correct result. **Check pin** opens the selected point on OpenStreetMap. **Save and publish** persists it with the rest of the draft. **Use city pin instead** removes the office refinement; selecting another city, Remote, or Clear location also removes it.

The public role label stays city, state/province, country. The address is never added to role descriptions, map marker titles, or accessibility labels. This is a presentation choice, not private storage: office coordinates and the stored address belong to the public content snapshot, and the exact pin is visible on the map. Only publish office locations intended to be public.

Address lookup uses the [Photon API](https://github.com/komoot/photon/blob/master/docs/api-v1.md) with OpenStreetMap data. Its [community service](https://github.com/komoot/photon#demo-server) permits reasonable usage but offers no availability guarantee. No API key or new dependency is needed. Only explicit owner searches contact the service; typing and public visits never geocode. Searches include the selected city, country restriction, and a geographic bias. Results require a street number and street name, so a city or street midpoint is never silently substituted for an office. Coverage is not exhaustive; review the pin before publishing. A missing match or failed lookup leaves the saved location unchanged.

Requests are throttled to at most one per 1.1 seconds per browser module, cached in memory (up to 50 searches), and cancelled on input/context changes or after 15 seconds. Only selected results are persisted. Public rendering uses saved coordinates independently of Photon. The endpoint is isolated in `src/lib/office-search.ts` if another Photon host is needed. Browser tests use mocked responses; a separate manual search checks the live integration.

The backward-compatible `place.office` field contains `{ address, latitude, longitude }`. City coordinates remain in `place.latitude` and `place.longitude` for removal/fallback. Office values are validated before publication and public reads. Existing Firebase payload rules and owner authorization continue to apply; no cloud rule deployment or content migration is required.

## Asset contract

Paths below are relative to `public/` and are fetched from `/geography/…`.

| File | Contents | Raw bytes | Gzip bytes, level 9 |
| --- | --- | ---: | ---: |
| `geography/boundaries.topo.json` | All country/coast polygons and worldwide admin-1 lines | 1,944,546 | 811,165 |
| `geography/countries.json` | 250 country options | 8,573 | 2,298 |
| `geography/locations/US.json` | US regions and cities; largest country file | 2,306,343 | 606,064 |
| `geography/locations/CA.json` | Canadian regions and cities | 126,453 | 34,443 |
| `geography/locations/{CC}.json` | One file per country; 250 files total | See manifest | See manifest |
| `geography/manifest.json` | Source pins, transformation settings, counts, versions, asset sizes and SHA-256 checksums | — | — |
| `geography/ATTRIBUTION.md` | Natural Earth and location-data attribution | — | — |
| `geography/LICENSE.country-state-city.txt` | Unmodified license from the installed npm package | — | — |

The globe meets the approximately 1 MB target **when compressed**, not as raw JSON. The full 10m geography retains small islands and every drawable source admin-1 segment. The generator enforces a 1,000,000-byte gzip budget. Actual transfer size depends on the hosting server enabling gzip or Brotli; `gzipBytes` is a measured size, not a claim about HTTP response headers. All data and notices together occupy approximately 19.4 MB on disk, excluding the manifest. Only the topology belongs in the public globe's request path.

### Country index

```ts
interface CountryOption {
  code: string; // country-state-city ISO code, e.g. US or CA
  name: string;
}
// countries.json: CountryOption[]
```

The index contains neither city records nor coordinates. Validate the selected code against this index before fetching its country file.

### Country location file

```ts
interface CountryLocations {
  regions: Array<{ code: string; name: string }>;
  cities: Array<{
    id: string;
    name: string;
    regionCode: string;
    latitude: number;
    longitude: number;
  }>;
}
// locations/US.json: CountryLocations
```

Select a country, fetch `/geography/locations/${code}.json`, and filter that file's cities by `regionCode`. Region codes are country-scoped; preserve their string representation, including leading zeroes and hyphens. Sort or search the loaded options as needed, but use `city.id` as the option value. Do not preload the other country files or import the generation package into client code.

The data contains **4,963 regions and 148,038 cities**. All regions remain available, including **1,531 without cities**. There are **58 countries without city entries** in this package version; their country files still exist, with empty city arrays. Missing cities are source coverage gaps, not failed network requests. Browsing countries or regions leaves the role's current location unchanged. Selecting a city updates its label and `place` together; Remote and Clear remove previous coordinates. Existing text-only labels can be retained. The picker never invents a regional point or uses `(0, 0)` as a fallback.

For a selected city, the integration mapping is:

```ts
const place = {
  latitude: city.latitude,
  longitude: city.longitude,
  countryCode,
  regionCode: city.regionCode,
  city: city.name,
};
```

City coordinates are the package's numeric WGS84 longitude/latitude values. GeoJSON/d3 positions use `[longitude, latitude]`, in that order. These points represent source city locations, not street addresses or verified employer offices.

IDs are `${countryCode}:${regionCode}:${hash}`, where `hash` is the first 20 hexadecimal characters of SHA-256 over `JSON.stringify([countryCode, regionCode, name, latitude, longitude])`. This distinguishes same-name cities at different coordinates within a region and stays stable when array order changes. IDs are not array indices or upstream database IDs. Updating a city's name/coordinates changes its ID. The generator rejects hash collisions and would deduplicate identical source records; this pin has zero duplicates. Sorting uses deterministic Unicode code-unit comparison rather than environment-dependent locale collation.

### Globe topology

`boundaries.topo.json` is a TopoJSON `Topology` with:

- `objects.countries`: `GeometryCollection` containing 258 `Polygon`/`MultiPolygon` geometries. Each has Natural Earth `ADM0_A3` as `id` and `{name, code}` properties. `code` is `ISO_A2_EH` when it is two uppercase letters, otherwise `null`.
- `objects.admin1`: one `MultiLineString`, containing 11,726 stitched worldwide first-order subdivision line parts. Use it as drawing geometry; it is not a region hit-testing or naming dataset.
- Shared, delta-encoded arcs and a quantization transform. Decode with `topojson-client`; do not interpret arc values as longitude/latitude directly.

```ts
const land = feature(topology, topology.objects.countries);
const countryAndCoastLines = mesh(topology, topology.objects.countries);
const subdivisionLines = feature(topology, topology.objects.admin1);
// Feed these GeoJSON values to geoPath(geoOrthographic()).
```

Use the country polygons for fills, country mesh for coast/country strokes, and admin-1 geometry for state/province strokes. Polygon winding is normalized for d3-geo: clockwise exteriors, counterclockwise holes. Country features and selector options come from different datasets and are not a one-to-one join; Natural Earth includes separate cartographic/disputed units. No joins are needed to plot a selected city.

## Sources and licenses

The boundary source is the [official Natural Earth vector repository](https://github.com/nvkelso/natural-earth-vector), release tag **v5.1.2**, immutable commit **`f1890d9f152c896d250a77557a5751a93d494776`**:

- [10m country polygons](https://github.com/nvkelso/natural-earth-vector/blob/f1890d9f152c896d250a77557a5751a93d494776/geojson/ne_10m_admin_0_countries.geojson), SHA-256 `239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255`.
- [10m admin-1 lines](https://github.com/nvkelso/natural-earth-vector/blob/f1890d9f152c896d250a77557a5751a93d494776/geojson/ne_10m_admin_1_states_provinces_lines.geojson), SHA-256 `1a1f30ccaaf4cc9c4bde34266f0b8cbb955d3a4cf254b756912255f2ec7c75b6`.

Natural Earth identifies its data as public domain in its [terms of use](https://www.naturalearthdata.com/about/terms-of-use/). The retained attribution is “Made with Natural Earth.” Its [10m cultural dataset documentation](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/) describes worldwide internal administrative divisions and its default de facto boundary representation. The release is a fixed historical snapshot, not a claim of current legal boundaries. The [110m admin-1 dataset](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-1-states-provinces/) covers only the US, so it is unsuitable for the worldwide subdivision requirement.

Selector data comes from the npm-managed [country-state-city](https://github.com/harpreetkhalsagtbit/country-state-city) **3.2.1** package. That exact package declares **GPL-3.0** and credits [countries-states-cities-database](https://github.com/dr5hn/countries-states-cities-database) as its upstream data source. The generator copies the package's complete license unchanged and retains both attributions; it does not label the location data as public domain or infer a different license from a newer upstream repository. The transformation source is `scripts/prepare-geography.ts`; installed source-data checksums and package versions are recorded in the manifest.

## Reproduce and validate

Use the repository's Node version and existing npm lockfile. Dependencies are managed by the root project; the generator never installs packages or modifies package files. After installing the locked dependencies with the project's normal setup, run from the repository root:

```sh
rtk proxy npm exec -- tsx scripts/prepare-geography.ts
```

If the shell is not already using the project's Node 26.8.1 runtime, run the same npm-managed tool through it:

```sh
rtk proxy npm exec --yes --package=node@26.8.1 -- npm exec -- tsx scripts/prepare-geography.ts
```

On a cold cache, this downloads the two **immutable, checksum-verified** Natural Earth files. They are cached outside the public output in `path.join(os.tmpdir(), 'personal-website-geography')`. Set `GEOGRAPHY_SOURCE_DIR` to an existing directory containing the two named GeoJSON source files to use a persistent or transferred source cache. For these committed assets, only source preparation needs external network access; the separate street map uses live tiles as described above.

```sh
# Byte-for-byte comparison against committed outputs, using the cached source.
rtk proxy npm exec -- tsx scripts/prepare-geography.ts --offline --check

# Regenerate the picker data independently, with no source download required.
rtk proxy npm exec -- tsx scripts/prepare-geography.ts --locations-only

# Verify only the picker files.
rtk proxy npm exec -- tsx scripts/prepare-geography.ts --locations-only --check

# Example using a previously populated persistent cache.
rtk proxy env GEOGRAPHY_SOURCE_DIR=/path/to/natural-earth-cache npm exec -- tsx scripts/prepare-geography.ts --offline --check

rtk proxy npm run check
```

`--offline` fails on a missing cache file and never fetches. A bad cache checksum fails instead of silently replacing it. `--check` regenerates expected content in memory and compares every generated file byte-for-byte, including attribution, license, and manifest; it does not overwrite public assets. The manifest has no generation timestamp, so identical source/locked tools produce identical files. `--locations-only` intentionally leaves the boundary, license, attribution, and manifest files alone; run the full command to refresh the complete deliverable.

The complete output was verified byte-for-byte with the project's **Node 26.8.1** runtime using the wrapper above and `--offline --check`. Initial generation and fresh-cache download checks also passed with Node 22.16.0; all 255 files, including measured gzip sizes, are identical across those tested runtimes. Reproduction targets Node 26.8.1 and the npm lockfile. Recheck when changing runtime versions because compression measurements may vary with zlib. The generator itself performs no dependency installation or package-file change.

The boundary pipeline joins adjacent admin-1 fragments with `topojson-client.mesh`, then builds shared topology with `topojson-server`, weights vertices by spherical triangle area with `topojson-simplify`, and quantizes/delta-encodes the result. The spherical area threshold is `0.000002` steradians. Quantization uses `1,000,000,000` positions to preserve even very short source fragments. Small closed arcs are protected, and rings that collapse or change winding are restored from their original vertices. Restoration repeats until shared-arc changes no longer require repairs. No country, US state, Canadian province, or other admin-1 outline is removed through scale-rank filtering.

The source has 10,179 admin-1 features, including one null geometry and 33 zero-length parts. Mesh construction yields one additional empty part; these non-drawable parts are excluded and counted in the manifest. The generator compares all **370,677 unique nonzero source segments** before and after stitching to prove that stitching loses no drawable linework. It validates all 258 country geometries, US/Canadian source feature counts (153/31), ring closure, noncollapsed rings/lines, numeric coordinate bounds, and d3-compatible area. It executes `geoPath` with an orthographic projection over US, Asia, equatorial, antimeridian, and polar views and rejects missing/invalid path output.

Selector validation checks the pinned package version, 250 countries, 4,963 regions, 148,038 city records, unique country/region/city identifiers, city-to-region references, every coordinate, US sample regions including Alaska/Hawaii/DC, and all 13 Canadian provinces/territories. Source coverage gaps remain explicit. Browser interaction QA for the globe and picker belongs to their integrating components; geometry/path validation is not a claim that a browser interaction was tested here.
