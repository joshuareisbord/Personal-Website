import assert from 'node:assert/strict';
import test from 'node:test';

import { initialContent } from '../../src/data/content.ts';
import { parseContent, serializeContent } from '../../src/lib/content.ts';

test('content accepts current positions, optional fields, authored biography, and HTTPS photo', () => {
  const content = structuredClone(initialContent);
  content.profile.photo = { path: 'https://example.com/photo.jpg', alt: 'Portrait' };
  content.profile.experience = [
    { company: 'Company', title: 'Engineer', startDate: '2024', endDate: null },
  ];
  content.site.about = ['First paragraph.', 'Second paragraph with <b>literal text</b>.'];
  assert.deepEqual(parseContent(JSON.parse(serializeContent(content))), content);
});

test('contact methods may be omitted independently and normalize to empty strings', () => {
  for (const methods of [
    { email: '' },
    { phone: '', phoneHref: '' },
    { email: '', phone: '', phoneHref: '' },
  ]) {
    const content = { ...initialContent, site: { ...initialContent.site, ...methods } };
    assert.deepEqual(parseContent(JSON.parse(serializeContent(content))), content);
  }
  const { email: _email, phone: _phone, phoneHref: _phoneHref, ...site } = initialContent.site;
  const parsed = parseContent({ ...initialContent, site });
  assert.equal(parsed.site.email, '');
  assert.equal(parsed.site.phone, '');
  assert.equal(parsed.site.phoneHref, '');
  const whitespace = parseContent({
    ...initialContent,
    site: { ...site, email: '  ', phone: '  ', phoneHref: '  ' },
  });
  assert.deepEqual(whitespace.site, parsed.site);
});

test('work places round-trip coordinates while preserving legacy text-only locations', () => {
  const role = {
    company: 'Company',
    title: 'Engineer',
    startDate: '2024-03',
    endDate: null,
    location: 'Kingston, Ontario, Canada',
  };
  const place = {
    latitude: 44.2312,
    longitude: -76.486,
    countryCode: 'CA',
    regionCode: 'ON',
    city: 'Kingston',
  };
  const content = {
    ...initialContent,
    profile: { ...initialContent.profile, experience: [role, { ...role, place }] },
  };
  assert.deepEqual(parseContent(JSON.parse(serializeContent(content))), content);
  for (const invalid of [
    { ...place, latitude: 91 },
    { ...place, longitude: -181 },
    { ...place, latitude: NaN },
    { ...place, longitude: Infinity },
    { ...place, countryCode: '../US' },
  ]) {
    assert.throws(() =>
      parseContent({
        ...content,
        profile: { ...content.profile, experience: [{ ...role, place: invalid }] },
      }),
    );
  }
  assert.throws(() =>
    parseContent({
      ...content,
      profile: { ...content.profile, experience: [{ ...role, location: undefined, place }] },
    }),
  );
});

test('optional contact methods still reject malformed values and incomplete phone pairs', () => {
  for (const methods of [
    { email: 'broken' },
    { phone: '', phoneHref: 'tel:+13103511198' },
    { phone: 'Call me', phoneHref: '' },
    { phoneHref: 'tel:   ' },
  ]) {
    assert.throws(() =>
      parseContent({ ...initialContent, site: { ...initialContent.site, ...methods } }),
    );
  }
});

test('office locations round-trip separately from public labels and city coordinates', () => {
  const place = {
    latitude: 44.2312,
    longitude: -76.486,
    countryCode: 'CA',
    regionCode: 'ON',
    city: 'Kingston',
  };
  for (const office of [
    { address: '123 Main Street, Kingston, ON, Canada', latitude: 44.232, longitude: -76.487 },
    { address: 'a'.repeat(500), latitude: -90, longitude: -180 },
    { address: 'North office', latitude: 90, longitude: 180 },
    { address: 'Zero coordinates', latitude: 0, longitude: 0 },
  ]) {
    const role = {
      company: 'Company',
      title: 'Engineer',
      startDate: '2024',
      endDate: null,
      location: 'Kingston, Ontario, Canada',
      place: { ...place, office },
    };
    const content = {
      ...initialContent,
      profile: { ...initialContent.profile, experience: [role] },
    };
    assert.deepEqual(parseContent(JSON.parse(serializeContent(content))), content);
  }
});

test('office locations reject incomplete, malformed, unbounded, and city-less data', () => {
  const office = { address: '123 Main Street', latitude: 44.232, longitude: -76.487 };
  const place = {
    latitude: 44.2312,
    longitude: -76.486,
    countryCode: 'CA',
    regionCode: 'ON',
    city: 'Kingston',
    office,
  };
  const contentWithPlace = (value: unknown): unknown => ({
    ...initialContent,
    profile: {
      ...initialContent.profile,
      experience: [
        {
          company: 'Company',
          title: 'Engineer',
          startDate: '2024',
          endDate: null,
          location: 'Kingston, Ontario, Canada',
          place: value,
        },
      ],
    },
  });
  for (const invalid of [
    null,
    '',
    [],
    {},
    { latitude: 44, longitude: -76 },
    { address: '123 Main Street', longitude: -76 },
    { address: '123 Main Street', latitude: 44 },
    ...['', ' \n\t ', 'a'.repeat(501), 123].map((address) => ({ ...office, address })),
    ...[-90.001, 90.001, NaN, Infinity, -Infinity, '44', null].map((latitude) => ({
      ...office,
      latitude,
    })),
    ...[-180.001, 180.001, NaN, Infinity, -Infinity, '-76', null].map((longitude) => ({
      ...office,
      longitude,
    })),
    { ...office, unexpected: true },
  ]) {
    assert.throws(() => parseContent(contentWithPlace({ ...place, office: invalid })));
  }
  for (const city of [undefined, '', ' \t ', 'a'.repeat(501)]) {
    assert.throws(() => parseContent(contentWithPlace({ ...place, city })));
  }
});

test('content rejects invalid dates, unsafe links, incomplete and oversized publications', () => {
  for (const [key, value] of [
    ['github', 'javascript:alert(1)'],
    ['linkedin', 'http://example.com'],
    ['phoneHref', 'javascript:alert(1)'],
    ['email', 'no-email'],
  ]) {
    assert.throws(() =>
      parseContent({ ...initialContent, site: { ...initialContent.site, [key!]: value } }),
    );
  }
  for (const startDate of ['2024-13', 'tomorrow', '']) {
    assert.throws(() =>
      parseContent({
        ...initialContent,
        profile: {
          ...initialContent.profile,
          experience: [{ company: 'A', title: 'B', startDate, endDate: null }],
        },
      }),
    );
  }
  assert.throws(() =>
    parseContent({
      ...initialContent,
      profile: {
        ...initialContent.profile,
        experience: [{ company: 'A', title: 'B', startDate: '2025', endDate: '2024' }],
      },
    }),
  );
  assert.throws(() =>
    parseContent({
      ...initialContent,
      profile: {
        ...initialContent.profile,
        photo: { path: 'javascript:alert(1)', alt: 'Portrait' },
      },
    }),
  );
  assert.throws(() =>
    parseContent({ ...initialContent, site: { ...initialContent.site, about: [] } }),
  );
  assert.throws(() =>
    parseContent({
      ...initialContent,
      site: { ...initialContent.site, about: Array.from({ length: 20 }, () => 'a'.repeat(20_000)) },
    }),
  );
  assert.throws(() => parseContent({ ...initialContent, owners: ['attacker@example.com'] }));
});
