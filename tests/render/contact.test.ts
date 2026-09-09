import assert from 'node:assert/strict';
import test from 'node:test';

import { JSDOM } from 'jsdom';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { initialContent } from '../../src/data/content';
import { parseContent } from '../../src/lib/content';
import { Home } from '../../src/pages/home';

test('optional contact methods render independently without empty links', () => {
  for (const email of ['', initialContent.site.email]) {
    for (const phone of ['', initialContent.site.phone]) {
      const content = parseContent({ ...initialContent, site: { ...initialContent.site, email, phone, phoneHref: phone ? initialContent.site.phoneHref : '' } });
      const dom = new JSDOM(renderToStaticMarkup(createElement(Home, { content, year: 2026 })));
      try {
        const contact = dom.window.document.querySelector('#contact');
        assert.ok(contact);
        assert.equal(contact.querySelectorAll('a[href^="mailto:"]').length, email ? 1 : 0);
        assert.equal(contact.querySelectorAll('a[href^="tel:"]').length, phone ? 1 : 0);
        assert.equal(contact.querySelectorAll('a[href=""], a[href="mailto:"], a[href="tel:"]').length, 0);
        assert.equal(contact.querySelectorAll('#social-links a').length, 2);
        assert.equal(contact.querySelector('#social-heading')?.textContent, 'Find me online');
      } finally { dom.window.close(); }
    }
  }
});

test('contact social links sit below their label and use Material SVG icons without footer duplicates', () => {
  const dom = new JSDOM(renderToStaticMarkup(createElement(Home, { content: initialContent, year: 2026 })));
  try {
    const links = dom.window.document.querySelectorAll('#social-links a');
    assert.equal(links.length, 2);
    assert.deepEqual([...links].map((link) => link.textContent), ['LinkedIn↗', 'GitHub↗']);
    assert.equal(dom.window.document.querySelector('#social-heading')?.nextElementSibling?.querySelectorAll('a').length, 2);
    assert.equal(dom.window.document.querySelectorAll('footer #social-links, footer svg').length, 0);
    for (const link of links) {
      assert.ok(link.closest('#contact'));
      assert.equal(link.querySelector('svg')?.getAttribute('aria-hidden'), 'true');
      assert.ok(link.querySelector('path')?.getAttribute('d'));
      assert.equal(link.querySelector('img'), null);
      assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
    }
  } finally { dom.window.close(); }
});
