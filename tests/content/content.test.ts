import assert from 'node:assert/strict';
import test from 'node:test';

import { initialContent } from '../../src/data/content.ts';
import { parseContent, serializeContent } from '../../src/lib/content.ts';

test('content accepts current positions, optional fields, authored biography, and HTTPS photo', () => {
  const content = structuredClone(initialContent);
  content.profile.photo = { path: 'https://example.com/photo.jpg', alt: 'Portrait' };
  content.profile.experience = [{ company: 'Company', title: 'Engineer', startDate: '2024', endDate: null }];
  content.site.about = ['First paragraph.', 'Second paragraph with <b>literal text</b>.'];
  assert.deepEqual(parseContent(JSON.parse(serializeContent(content))), content);
});

test('content rejects invalid dates, unsafe links, incomplete and oversized publications', () => {
  for (const [key, value] of [['github', 'javascript:alert(1)'], ['linkedin', 'http://example.com'], ['phoneHref', 'javascript:alert(1)'], ['email', 'no-email']]) {
    assert.throws(() => parseContent({ ...initialContent, site: { ...initialContent.site, [key!]: value } }));
  }
  for (const startDate of ['2024-13', 'tomorrow', '']) {
    assert.throws(() => parseContent({ ...initialContent, profile: { ...initialContent.profile, experience: [{ company: 'A', title: 'B', startDate, endDate: null }] } }));
  }
  assert.throws(() => parseContent({ ...initialContent, profile: { ...initialContent.profile, experience: [{ company: 'A', title: 'B', startDate: '2025', endDate: '2024' }] } }));
  assert.throws(() => parseContent({ ...initialContent, profile: { ...initialContent.profile, photo: { path: 'javascript:alert(1)', alt: 'Portrait' } } }));
  assert.throws(() => parseContent({ ...initialContent, site: { ...initialContent.site, about: [] } }));
  assert.throws(() => parseContent({ ...initialContent, site: { ...initialContent.site, about: Array.from({ length: 20 }, () => 'a'.repeat(20_000)) } }));
  assert.throws(() => parseContent({ ...initialContent, owners: ['attacker@example.com'] }));
});
