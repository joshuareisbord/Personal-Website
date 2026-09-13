import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The build emits this module outside src; derive its contract from the TypeScript source.
type Renderer = Pick<typeof import('../src/entry-server'), 'renderPage'>;
const renderer: Renderer = await import(pathToFileURL(resolve('.prerender/entry-server.js')).href);
const year = new Date().getFullYear();
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');
}
for (const route of ['index', '404']) {
  const path = resolve(`dist/${route}.html`);
  const template = await readFile(path, 'utf8');
  if (!template.includes('<!--app-html-->') || !template.includes('<div id="root">')) {
    throw new Error('Build template is missing its React mount point.');
  }
  const page = renderer.renderPage(route === 'index' ? '/' : '/404', year);
  await writeFile(
    path,
    template
      .replace('<!--app-html-->', () => page.html)
      .replace('<div id="root">', `<div id="root" data-prerendered="true" data-year="${year}">`)
      .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(page.title)}</title>`),
  );
}
console.log('Prerendered React home and 404 pages for static hosting.');
