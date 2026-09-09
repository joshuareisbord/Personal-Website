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

test('contact methods may be omitted independently and normalize to empty strings', () => {
  for (const methods of [{ email: '' }, { phone: '', phoneHref: '' }, { email: '', phone: '', phoneHref: '' }]) {
    const content = { ...initialContent, site: { ...initialContent.site, ...methods } };
    assert.deepEqual(parseContent(JSON.parse(serializeContent(content))), content);
  }
  const { email: _email, phone: _phone, phoneHref: _phoneHref, ...site } = initialContent.site;
  const parsed = parseContent({ ...initialContent, site });
  assert.equal(parsed.site.email, '');
  assert.equal(parsed.site.phone, '');
  assert.equal(parsed.site.phoneHref, '');
  const whitespace = parseContent({ ...initialContent, site: { ...site, email: '  ', phone: '  ', phoneHref: '  ' } });
  assert.deepEqual(whitespace.site, parsed.site);
});

test('optional contact methods still reject malformed values and incomplete phone pairs', () => {
  for (const methods of [{ email: 'broken' }, { phone: '', phoneHref: 'tel:+13103511198' }, { phone: 'Call me', phoneHref: '' }, { phoneHref: 'tel:   ' }]) {
    assert.throws(() => parseContent({ ...initialContent, site: { ...initialContent.site, ...methods } }));
  }
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
