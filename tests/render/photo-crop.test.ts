import assert from 'node:assert/strict';
import test from 'node:test';

import { JSDOM } from 'jsdom';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ProfilePhoto } from '../../src/components/profile-photo';
import { initialContent } from '../../src/data/content';
import { parseContent, serializeContent } from '../../src/lib/content';
import { photoCropSchema, photoCropStyle, type PhotoCrop } from '../../src/lib/photo-crop';
import { Home } from '../../src/pages/home';

test('photo crops round-trip without changing legacy or absent photos', () => {
  for (const photo of [
    null,
    { path: '/profile/portrait.webp', alt: 'Portrait' },
    {
      path: '/profile/portrait.webp',
      alt: 'Portrait',
      crop: { x: 25, y: 10, width: 50, height: 80 },
    },
  ]) {
    const content = { ...initialContent, profile: { ...initialContent.profile, photo } };
    assert.deepEqual(parseContent(JSON.parse(serializeContent(content))), content);
  }
});

test('photo crop bounds allow rounding noise but reject malformed and overflowing crops', () => {
  const full = { x: 0, y: 0, width: 100, height: 100 };
  assert.deepEqual(photoCropSchema.parse(full), full);
  assert.ok(
    photoCropSchema.safeParse({ x: 0.1, y: 20, width: 99.90000000001, height: 80.00000000001 })
      .success,
  );
  assert.ok(photoCropSchema.safeParse({ x: 99, y: 99, width: 1, height: 1 }).success);
  for (const crop of [
    null,
    [],
    {},
    { x: 0, y: 0, width: 100 },
    { ...full, extra: true },
    ...['x', 'y', 'width', 'height'].flatMap((key) =>
      [NaN, Infinity, -Infinity, '1', null, -0.01].map((value) => ({ ...full, [key]: value })),
    ),
    { ...full, width: 0 },
    { ...full, height: 0 },
    { ...full, width: 100.001 },
    { ...full, height: 100.001 },
    { ...full, x: 0.0001 },
    { ...full, y: 0.0001 },
  ]) {
    assert.equal(photoCropSchema.safeParse(crop).success, false);
    assert.throws(() =>
      parseContent({
        ...initialContent,
        profile: {
          ...initialContent.profile,
          photo: { path: '/profile/portrait.webp', alt: 'Portrait', crop },
        },
      }),
    );
  }
});

test('crop layout maps the selected source rectangle exactly onto the photo frame', () => {
  for (const crop of [
    { x: 0, y: 0, width: 100, height: 100 },
    { x: 25, y: 10, width: 50, height: 80 },
    { x: 62.5, y: 20, width: 25, height: 40 },
  ] satisfies PhotoCrop[]) {
    const style = photoCropStyle(crop);
    assert.equal(style.maxWidth, 'none');
    const imageWidth = Number.parseFloat(String(style.width));
    const imageHeight = Number.parseFloat(String(style.height));
    const left = Number.parseFloat(String(style.left));
    const top = Number.parseFloat(String(style.top));
    const near = (value: number, expected: number): void =>
      assert.ok(Math.abs(value - expected) < 1e-9);
    near(left + (imageWidth * crop.x) / 100, 0);
    near(top + (imageHeight * crop.y) / 100, 0);
    near(left + (imageWidth * (crop.x + crop.width)) / 100, 100);
    near(top + (imageHeight * (crop.y + crop.height)) / 100, 100);
  }
});

test('shared photos render accessible cover defaults and explicit percentage crops', () => {
  for (const crop of [undefined, { x: 25, y: 10, width: 50, height: 80 }]) {
    const document = new JSDOM(
      renderToStaticMarkup(
        createElement(ProfilePhoto, {
          src: '/profile/portrait.webp',
          alt: 'Portrait',
          crop,
          className: 'grayscale',
          loading: 'lazy',
        }),
      ),
    ).window.document;
    const img = document.querySelector('img')!;
    assert.equal(img.getAttribute('src'), '/profile/portrait.webp');
    assert.equal(img.alt, 'Portrait');
    assert.equal(img.width, 416);
    assert.equal(img.height, 520);
    assert.equal(img.getAttribute('loading'), 'lazy');
    for (const name of ['relative', 'aspect-[4/5]', 'overflow-hidden', 'grayscale'])
      assert.ok(img.parentElement!.classList.contains(name));
    if (crop) {
      assert.equal(img.style.width, '200%');
      assert.equal(img.style.height, '125%');
      assert.equal(img.style.left, '-50%');
      assert.equal(img.style.top, '-12.5%');
      assert.equal(img.style.maxWidth, 'none');
      assert.ok(img.classList.contains('absolute'));
      assert.equal(img.classList.contains('object-cover'), false);
    } else {
      for (const name of ['object-cover', 'w-full', 'h-full'])
        assert.ok(img.classList.contains(name));
      assert.equal(img.getAttribute('style'), null);
    }
  }
});

test('About uses the shared crop and fills its existing left column', () => {
  const content = {
    ...initialContent,
    profile: {
      ...initialContent.profile,
      photo: {
        path: '/profile/portrait.webp',
        alt: 'Portrait',
        crop: { x: 25, y: 10, width: 50, height: 80 },
      },
    },
  };
  const document = new JSDOM(renderToStaticMarkup(createElement(Home, { content, year: 2026 })))
    .window.document;
  const about = document.querySelector('#about')!;
  const figure = about.querySelector('figure')!;
  assert.ok(about.classList.contains('lg:grid-cols-[1fr_2fr]'));
  for (const name of ['w-full', 'max-w-md', 'lg:max-w-none'])
    assert.ok(figure.classList.contains(name));
  assert.equal(figure.querySelector('figcaption')!.textContent, content.profile.name);
  assert.equal(figure.querySelector('img')!.style.width, '200%');
  assert.ok(figure.querySelector('img')!.parentElement!.classList.contains('grayscale'));
});
