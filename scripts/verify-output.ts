import assert from 'node:assert/strict';
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { parseProfile } from '../src/lib/profile.ts';
import { validateStaticCss, validateStaticHtml } from './output-validation.ts';

const root = resolve('.');
const output = await realpath(join(root, 'dist'));
const snapshot = parseProfile(
  JSON.parse(await readFile(join(root, 'src/data/profile.json'), 'utf8')),
);
const home = await readFile(join(output, 'index.html'), 'utf8');
const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');
assert.match(home, /<h1\b/);
assert.match(home, /id="experience"/);
assert.match(home, /id="contact"/);
assert.ok(home.includes(escapeHtml(snapshot.name)), 'Profile name missing from prerendered HTML.');
assert.ok(
  validateStaticHtml(home).some((reference) => reference.endsWith('.js')),
  'React hydration module missing from home HTML.',
);
for (const entry of snapshot.experience) {
  assert.ok(
    home.includes(escapeHtml(entry.company)),
    'Experience company missing from static HTML.',
  );
  assert.ok(home.includes(escapeHtml(entry.title)), 'Experience title missing from static HTML.');
}
if (snapshot.photo)
  assert.ok(
    home.includes(escapeHtml(snapshot.photo.path)),
    'Profile photo missing from prerendered HTML.',
  );
for (const route of ['index.html', '404.html'])
  assert.ok((await stat(join(output, route))).isFile(), 'Required route missing.');

async function verifyAsset(reference: string, containingFile: string): Promise<void> {
  const path = decodeURIComponent(reference.split(/[?#]/)[0] ?? '');
  const requested = resolve(
    reference.startsWith('/') ? output : dirname(containingFile),
    path.replace(/^\//, ''),
  );
  const actual = await realpath(requested);
  const withinOutput = relative(output, actual);
  assert.ok(
    withinOutput && !withinOutput.startsWith(`..${sep}`) && withinOutput !== '..',
    'Resource escaped public output.',
  );
  assert.ok((await stat(actual)).isFile(), 'Local asset is missing or not a file.');
}

for (const entry of await readdir(output, { recursive: true, withFileTypes: true })) {
  const path = join(entry.parentPath, entry.name);
  const relativePath = relative(output, path);
  assert.ok(
    !relativePath.split(sep).some((part) => part.startsWith('.') || part === 'node_modules'),
    'Private or server build directory in public output.',
  );
  assert.ok(
    !/(?:entry-server|prerender)|\.(?:map|csv|zip|ts|tsx)$|\.env/i.test(entry.name),
    'Private or build-only file in public output.',
  );
  assert.ok(!entry.isSymbolicLink(), 'Public output must not contain symlinks.');
  if (!entry.isFile()) continue;
  const bytes = await readFile(path);
  for (const key of ['FIREBASE_SERVICE_ACCOUNT', 'FIREBASE_TOKEN']) {
    const secret = process.env[key];
    if (secret)
      assert.ok(!bytes.includes(Buffer.from(secret)), 'Credential appeared in public output.');
  }
  if (/\.(?:html|css|js|json)$/.test(entry.name)) {
    const text = bytes.toString('utf8');
    const references = entry.name.endsWith('.html')
      ? validateStaticHtml(text)
      : entry.name.endsWith('.css')
        ? validateStaticCss(text)
        : [];
    for (const reference of references) await verifyAsset(reference, path);
  }
}
console.log(
  'React output verified: prerendered fallback, local application assets, routes, and no server artifacts or known credentials.',
);
