import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';

import { JSDOM } from 'jsdom';

import { validateStaticCss, validateStaticHtml } from '../../scripts/output-validation.ts';

const exec = promisify(execFile);
const project = fileURLToPath(new URL('../../', import.meta.url));

test('output permits HTTPS profile images while restricting executable and CSS references', () => {
  assert.doesNotThrow(() =>
    validateStaticHtml('<p>Built reporting with Firestore and api.linkedin.com.</p>'),
  );
  assert.doesNotThrow(() => validateStaticHtml('<img src="https://example.com/photo" />'));
  assert.throws(() => validateStaticHtml('<img src="http://example.com/photo" />'));
  assert.throws(() =>
    validateStaticCss('a { background: url("https://firebasestorage.googleapis.com/photo"); }'),
  );
  assert.deepEqual(validateStaticCss('a { background: url("/profile/photo.webp"); }'), [
    '/profile/photo.webp',
  ]);
});

test('output permits only local Vite module scripts, rejecting inline and remote execution', () => {
  assert.deepEqual(
    validateStaticHtml('<script type="module" crossorigin src="/assets/main-Ab_12.js"></script>'),
    ['/assets/main-Ab_12.js'],
  );
  for (const script of [
    '<script src="/assets/main.js"></script>',
    '<script type="module" src="/client.js"></script>',
    '<script type="module" src="https://example.test/client.js"></script>',
    '<script type="module" src="//example.test/client.js"></script>',
    '<script type="module">alert(1)</script>',
    '<script type="module" src="/assets/main.js">alert(1)</script>',
    '<script type="module" src="/assets/main.js" onload="alert(1)"></script>',
    '<script type="application/json">{"name":"Fixture"}</script>',
    '<script type="module" src="/assets/../client.js"></script>',
    '<img src="/profile/photo.png" onerror="alert(1)">',
    '<a href="javascript:alert(1)">Run</a>',
  ])
    assert.throws(() => validateStaticHtml(script));
  assert.deepEqual(
    validateStaticHtml(
      '<link rel="stylesheet" href="/assets/main.css"><img src="/profile/photo.png"><a href="https://www.linkedin.com/in/fixture">Profile</a>',
    ),
    ['/assets/main.css', '/profile/photo.png'],
  );
});

test(
  'React/Vite builds prerender populated profile HTML and local hydration assets',
  { timeout: 90_000 },
  async () => {
    const root = await mkdtemp(join(tmpdir(), 'website-render-'));
    try {
      await Promise.all([
        cp(join(project, 'src'), join(root, 'src'), { recursive: true }),
        cp(join(project, 'public'), join(root, 'public'), { recursive: true }),
        cp(join(project, 'scripts'), join(root, 'scripts'), { recursive: true }),
        ...['vite.config.ts', 'tsconfig.json', 'package.json', '404.html', 'index.html'].map(
          (file) => cp(join(project, file), join(root, file)),
        ),
        symlink(join(project, 'node_modules'), join(root, 'node_modules'), 'junction'),
      ]);
      await mkdir(join(root, 'public/profile'), { recursive: true });
      await writeFile(
        join(root, 'public/profile/fixture.webp'),
        Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64'),
      );
      await writeFile(
        join(root, 'src/data/profile.json'),
        JSON.stringify({
          schemaVersion: 1,
          name: "Fixture O'Neil",
          photo: { path: '/profile/fixture.webp', alt: 'Fixture portrait' },
          experience: [
            {
              company: 'Example & Company',
              title: 'Engineer',
              startDate: '2024-03',
              endDate: null,
              description:
                'Built reporting with Firestore.\nSecond line with <b>literal markup</b>.',
            },
            {
              company: 'Earlier Company',
              title: 'Developer',
              startDate: '2021',
              endDate: '2023',
              location: 'Remote',
            },
          ],
        }),
      );
      const credential = 'fixture-private-credential-must-never-be-published';
      const options = {
        cwd: root,
        timeout: 45_000,
        env: { ...process.env, CI: 'true', FIREBASE_SERVICE_ACCOUNT: credential },
      };
      const vite = join(project, 'node_modules/vite/bin/vite.js');
      await exec(process.execPath, [vite, 'build'], options);
      await exec(
        process.execPath,
        [vite, 'build', '--ssr', 'src/entry-server.tsx', '--outDir', '.prerender'],
        options,
      );
      await exec(process.execPath, ['--import', 'tsx', 'scripts/prerender.ts'], options);
      const verify = (): Promise<unknown> =>
        exec(process.execPath, ['--import', 'tsx', 'scripts/verify-output.ts'], options);
      await verify();
      const html = await readFile(join(root, 'dist/index.html'), 'utf8');
      const document = new JSDOM(html, { url: 'https://fixture.invalid/' }).window.document;
      assert.equal(document.querySelectorAll('h1').length, 1);
      assert.equal(
        document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim(),
        "Fixture O'Neil",
      );
      const images = document.querySelectorAll('img');
      assert.equal(
        images.length,
        1,
        'The populated profile must render exactly one image, with no logo images.',
      );
      assert.equal(images[0]?.getAttribute('src'), '/profile/fixture.webp');
      assert.equal(images[0]?.getAttribute('alt'), 'Fixture portrait');
      const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')];
      const socialLinks = links.filter((link) =>
        /^(?:www\.)?(?:github|linkedin)\.com$/.test(new URL(link.href).hostname),
      );
      assert.deepEqual(
        socialLinks.map((link) => new URL(link.href).hostname.replace(/^www\./, '')).sort(),
        ['github.com', 'linkedin.com'],
      );
      for (const link of socialLinks)
        assert.ok(link.closest('#contact'), 'Social links must appear in the contact section.');
      assert.equal(
        document.querySelector('#projects'),
        null,
        'The obsolete projects anchor must be removed.',
      );
      assert.ok(
        links.every((link) => !/view\s+projects/i.test(link.textContent ?? '')),
        'Project CTAs must be removed.',
      );
      assert.match(html, /Fixture O&#x27;Neil/);
      assert.match(html, /Example &amp; Company/);
      assert.match(html, /March, 2024/);
      assert.match(html, /Present/);
      assert.match(html, /datetime="2021">2021<\/time>/i);
      assert.match(html, /datetime="2023">2023<\/time>/i);
      assert.match(html, /Remote/);
      assert.match(html, /&lt;b&gt;literal markup&lt;\/b&gt;/);
      assert.match(html, /src="\/profile\/fixture.webp"/);
      assert.match(html, /alt="Fixture portrait"/);
      assert.match(html, /data-prerendered="true"/);
      assert.match(html, /Owners Login/);
      assert.match(html, /data-year="\d{4}"/);
      const references = validateStaticHtml(html);
      assert.ok(references.some((reference) => /^\/assets\/.*\.js$/.test(reference)));
      assert.match(html, /Built reporting with Firestore\./);
      assert.doesNotMatch(html, /loading\.\.\./i);
      assert.doesNotMatch(
        html,
        /<!--app-html-->|https:\/\/(?:api\.linkedin\.com|firestore\.googleapis\.com|firebasestorage\.googleapis\.com)/,
      );
      assert.ok((await readFile(join(root, 'dist/profile/fixture.webp'))).length > 0);
      const notFound = await readFile(join(root, 'dist/404.html'), 'utf8');
      assert.match(notFound, /Page not found/i);
      assert.match(notFound, /href="\/"/);
      assert.ok(validateStaticHtml(notFound).some((reference) => reference.endsWith('.js')));
      assert.equal(
        document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
        'https://joshuareisbord.com/',
      );
      assert.equal(document.querySelector('meta[http-equiv="refresh"]'), null);
      assert.equal((await readdir(join(root, 'dist'))).includes('home.html'), false);
      assert.ok(
        links.every((link) => !link.getAttribute('href')?.startsWith('/home')),
        'Internal links must use the root route.',
      );
      assert.equal((await readdir(join(root, 'dist'))).includes('.prerender'), false);
      const clientFiles = (await readdir(join(root, 'dist/assets'))).filter((name) =>
        name.endsWith('.js'),
      );
      const client = (
        await Promise.all(
          clientFiles.map((name) => readFile(join(root, 'dist/assets', name), 'utf8')),
        )
      ).join('\n');
      assert.match(client, /Fixture O'Neil/);
      assert.match(client, /Built reporting with Firestore/);
      assert.equal(client.includes(credential), false);

      const stylesheets = [...document.querySelectorAll('link[rel="stylesheet"]')].map(
        (link) => link.getAttribute('href') ?? '',
      );
      const fontReferences = (
        await Promise.all(
          stylesheets.map(async (reference) => {
            const css = await readFile(join(root, 'dist', reference.replace(/^\//, '')), 'utf8');
            return validateStaticCss(css).filter((asset) => asset.endsWith('.woff2'));
          }),
        )
      ).flat();
      assert.ok(
        fontReferences.some((reference) => /^\/assets\/barlow-.*\.woff2$/.test(reference)),
        'Barlow must be referenced as a local WOFF2 build asset.',
      );
      assert.ok(
        fontReferences.some((reference) => /^\/assets\/ibm-plex-mono-.*\.woff2$/.test(reference)),
        'IBM Plex Mono must be referenced as a local WOFF2 build asset.',
      );
      const fontPath = join(root, 'dist', fontReferences[0]!.replace(/^\//, ''));
      const fontBytes = await readFile(fontPath);
      await rm(fontPath);
      await assert.rejects(verify(), 'Missing referenced fonts must fail output verification.');
      await writeFile(fontPath, fontBytes);

      await writeFile(
        join(root, 'dist/index.html'),
        html.replace('</body>', '<img src="/assets/missing.png"></body>'),
      );
      await assert.rejects(verify(), 'Missing referenced assets must fail output verification.');
      await writeFile(join(root, 'dist/index.html'), html);
      await writeFile(
        join(root, 'dist/assets/credential-fixture.js'),
        `const secret = "${credential}";`,
      );
      await assert.rejects(verify(), 'Actual credential values must fail output verification.');
      await rm(join(root, 'dist/assets/credential-fixture.js'));
      await mkdir(join(root, 'dist/.prerender'));
      await assert.rejects(verify(), 'Server build output must never be published.');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
