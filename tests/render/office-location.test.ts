import assert from 'node:assert/strict';
import test from 'node:test';

import { JSDOM } from 'jsdom';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { initialContent } from '../../src/data/content';
import { parseContent, serializeContent } from '../../src/lib/content';
import { Home } from '../../src/pages/home';

test('public Home preserves city labels without exposing office addresses in page text or accessibility labels', (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Public rendering must not look up an office.');
  });
  const offices = [
    {
      address: '8842 Confidential Quay, Suite 731, Kingston, Ontario, Canada',
      latitude: 44.232,
      longitude: -76.487,
    },
    {
      address: '9273 Private Terrace, Floor 618, Montréal, Quebec, Canada',
      latitude: 45.51,
      longitude: -73.58,
    },
  ];
  const content = parseContent({
    ...initialContent,
    profile: {
      ...initialContent.profile,
      experience: [
        {
          company: 'First Company',
          title: 'Engineer',
          startDate: '2020',
          endDate: '2022',
          location: 'Kingston, Ontario, Canada',
          place: {
            city: 'Kingston',
            regionCode: 'ON',
            countryCode: 'CA',
            latitude: 44.2312,
            longitude: -76.486,
            office: offices[0],
          },
        },
        {
          company: 'Second Company',
          title: 'Senior Engineer',
          startDate: '2023',
          endDate: null,
          location: 'Montréal, Quebec, Canada',
          place: {
            city: 'Montréal',
            regionCode: 'QC',
            countryCode: 'CA',
            latitude: 45.5019,
            longitude: -73.5674,
            office: offices[1],
          },
        },
      ],
    },
  });
  const serialized = serializeContent(content);
  for (const office of offices)
    assert.ok(
      serialized.includes(office.address),
      'The published data intentionally retains office addresses.',
    );
  const dom = new JSDOM(renderToStaticMarkup(createElement(Home, { content, year: 2026 })));
  try {
    const document = dom.window.document;
    const experience = document.querySelector('#experience');
    assert.ok(experience);
    for (const role of content.profile.experience) {
      assert.ok(experience.textContent?.includes(role.location!));
      assert.ok(experience.textContent?.includes(role.company));
    }
    // Serialized snapshots may contain addresses by design; inspect presented DOM, not raw HTML.
    const presented = document.body.cloneNode(true) as HTMLElement;
    presented.querySelectorAll('script, style, template').forEach((element) => element.remove());
    const text = presented.textContent ?? '';
    const labels = [...presented.querySelectorAll('*')]
      .flatMap((element) =>
        [...element.attributes]
          .filter(
            (attribute) =>
              attribute.name.startsWith('aria-') || ['alt', 'title'].includes(attribute.name),
          )
          .map((attribute) => attribute.value),
      )
      .join('\n');
    for (const office of offices) {
      for (const addressText of [office.address, office.address.split(',')[0]!]) {
        assert.equal(
          text.includes(addressText),
          false,
          `Office address leaked into public text: ${addressText}`,
        );
        assert.equal(
          labels.includes(addressText),
          false,
          `Office address leaked into an accessibility label: ${addressText}`,
        );
      }
    }
    assert.equal(fetchMock.mock.callCount(), 0);
  } finally {
    dom.window.close();
  }
});

test('public Home continues to render city-only and legacy remote roles without an office', () => {
  const content = parseContent({
    ...initialContent,
    profile: {
      ...initialContent.profile,
      experience: [
        {
          company: 'City Company',
          title: 'Engineer',
          startDate: '2020',
          endDate: '2022',
          location: 'Kingston, Ontario, Canada',
          place: {
            city: 'Kingston',
            regionCode: 'ON',
            countryCode: 'CA',
            latitude: 44.2312,
            longitude: -76.486,
          },
        },
        {
          company: 'Remote Company',
          title: 'Senior Engineer',
          startDate: '2023',
          endDate: null,
          location: 'Remote',
        },
      ],
    },
  });
  const dom = new JSDOM(renderToStaticMarkup(createElement(Home, { content, year: 2026 })));
  try {
    const experience = dom.window.document.querySelector('#experience');
    assert.ok(experience);
    assert.match(experience.textContent!, /Kingston, Ontario, Canada/);
    assert.match(experience.textContent!, /Remote/);
    assert.doesNotMatch(experience.textContent!, /undefined|null|Office address/);
  } finally {
    dom.window.close();
  }
});
