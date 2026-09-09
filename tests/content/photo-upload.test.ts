import assert from 'node:assert/strict';
import test from 'node:test';

import { JSDOM } from 'jsdom';
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { PhotoPicker } from '../../src/components/photo-picker.tsx';
import { getPhotoDimensions, MAX_PHOTO_INPUT_BYTES, MAX_PHOTO_OUTPUT_BYTES, PHOTO_OUTPUT_TYPE, preparePhoto, validatePhotoInput, validatePreparedPhoto } from '../../src/lib/photo-upload.ts';

function replaceGlobals(values: Record<string, unknown>): () => void {
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  return () => {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  };
}

test('photo input and prepared upload validation share strict type and byte limits', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/webp']) validatePhotoInput({ type, size: MAX_PHOTO_INPUT_BYTES });
  for (const type of ['', 'image/gif', 'image/svg+xml', 'text/plain']) assert.throws(() => validatePhotoInput({ type, size: 10 }), /PNG, JPEG, or WebP/);
  for (const size of [0, -1, NaN, Infinity, MAX_PHOTO_INPUT_BYTES + 1]) assert.throws(() => validatePhotoInput({ type: 'image/jpeg', size }));
  validatePreparedPhoto({ type: PHOTO_OUTPUT_TYPE, size: MAX_PHOTO_OUTPUT_BYTES });
  for (const size of [0, NaN, MAX_PHOTO_OUTPUT_BYTES + 1]) assert.throws(() => validatePreparedPhoto({ type: PHOTO_OUTPUT_TYPE, size }));
  assert.throws(() => validatePreparedPhoto({ type: 'image/png', size: 10 }));
});

test('photo dimensions preserve aspect ratio, avoid upscaling, and reject excessive decoded images', () => {
  assert.deepEqual(getPhotoDimensions(4000, 2000), { width: 1200, height: 600 });
  assert.deepEqual(getPhotoDimensions(1000, 4000), { width: 300, height: 1200 });
  assert.deepEqual(getPhotoDimensions(320, 240), { width: 320, height: 240 });
  assert.deepEqual(getPhotoDimensions(8000, 5000), { width: 1200, height: 750 });
  assert.deepEqual(getPhotoDimensions(1, 10000), { width: 1, height: 1200 });
  for (const [width, height] of [[0, 1], [NaN, 1], [Infinity, 1], [1.5, 2], [8000, 5001], [40000, 1]]) assert.throws(() => getPhotoDimensions(width!, height!));
});

test('preparation decodes, resizes, flattens transparency, encodes JPEG, and releases decoded resources', async () => {
  let closed = 0;
  const draws: unknown[][] = [];
  const fills: unknown[][] = [];
  const encodes: unknown[][] = [];
  let size = 100;
  const canvas = {
    width: 0, height: 0,
    getContext: () => ({ fillStyle: '', fillRect: (...args: unknown[]) => fills.push(args), drawImage: (...args: unknown[]) => draws.push(args) }),
    toBlob: (callback: BlobCallback, type: string, quality: number) => { encodes.push([type, quality]); callback(new Blob([new Uint8Array(size)], { type })); },
  };
  const restore = replaceGlobals({
    createImageBitmap: async () => ({ width: 4000, height: 2000, close: () => { closed += 1; } }),
    document: { createElement: () => canvas },
  });
  const input = new File(['fixture'], 'photo.png', { type: 'image/png' });
  try {
    const output = await preparePhoto(input);
    assert.equal(output.type, PHOTO_OUTPUT_TYPE);
    assert.deepEqual(draws[0]?.slice(1), [0, 0, 1200, 600]);
    assert.deepEqual(fills[0], [0, 0, 1200, 600]);
    assert.deepEqual(encodes[0], [PHOTO_OUTPUT_TYPE, 0.85]);
    assert.equal(closed, 1);
    size = MAX_PHOTO_OUTPUT_BYTES + 1;
    await assert.rejects(preparePhoto(input), /1 MiB/);
    assert.equal(closed, 2);
  } finally { restore(); }
});

test('preparation rejects invalid input before decoding and reports corrupt image data', async () => {
  let attempts = 0;
  const restore = replaceGlobals({ createImageBitmap: async () => { attempts += 1; throw new Error('decoder failed'); } });
  try {
    await assert.rejects(preparePhoto(new File(['x'], 'fake.svg', { type: 'image/svg+xml' })), /PNG, JPEG, or WebP/);
    assert.equal(attempts, 0);
    await assert.rejects(preparePhoto(new File(['broken'], 'fake.jpg', { type: 'image/jpeg' })), /decode/);
    assert.equal(attempts, 1);
  } finally { restore(); }
});

test('preparation releases decoded images after dimension and canvas failures', async () => {
  let width = 8000;
  let closed = 0;
  const restore = replaceGlobals({
    createImageBitmap: async () => ({ width, height: 6000, close: () => { closed += 1; } }),
    document: { createElement: () => ({
      getContext: () => ({ fillRect: () => {}, drawImage: () => {} }),
      toBlob: (callback: BlobCallback) => { callback(null); },
    }) },
  });
  const file = new File(['fixture'], 'photo.png', { type: 'image/png' });
  try {
    await assert.rejects(preparePhoto(file), /40 megapixels/);
    assert.equal(closed, 1);
    width = 4000;
    await assert.rejects(preparePhoto(file), /Could not prepare/);
    assert.equal(closed, 2);
  } finally { restore(); }
});

test('picker ignores stale selections, keeps blob URLs local, and cleans up on replacement, reset, and unmount', async () => {
  const dom = new JSDOM('<div id="test"></div>', { url: 'https://example.com' });
  const created: string[] = [];
  const revoked: string[] = [];
  const decodes: Array<() => void> = [];
  const paths: string[] = [];
  const files: Array<Blob | null> = [];
  const busy: boolean[] = [];
  const restore = replaceGlobals({
    window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true,
    createImageBitmap: () => new Promise((resolve) => { decodes.push(() => resolve({ width: 10, height: 10, close: () => {} })); }),
  });
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => { const url = `blob:preview-${created.length}`; created.push(url); return url; };
  URL.revokeObjectURL = (url) => { revoked.push(url); };
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, 'getContext', { value: () => ({ fillRect: () => {}, drawImage: () => {} }) });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, 'toBlob', { value: (callback: BlobCallback) => callback(new Blob(['jpeg'], { type: PHOTO_OUTPUT_TYPE })) });
  const host = dom.window.document.getElementById('test')!;
  const root = createRoot(host);
  let reset: (() => void) | undefined;
  function Harness(): ReturnType<typeof createElement> {
    const [path, setPath] = useState('/profile/portrait.jpg');
    const [file, setFile] = useState<Blob | null>(null);
    reset = () => { setPath('/profile/saved.jpg'); setFile(null); };
    return createElement('fieldset', {}, createElement(PhotoPicker, { path, file, alt: 'Portrait',
      onPathChange: (value) => { paths.push(value); setPath(value); },
      onFileChange: (value) => { files.push(value); setFile(value); },
      onPreparingChange: (value) => { busy.push(value); },
    }));
  }
  const select = async (name = 'photo.png', type = 'image/png'): Promise<void> => {
    const input = host.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { value: [new File(['fixture'], name, { type })], configurable: true });
    await act(async () => { input.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
  };
  const click = async (text: string): Promise<void> => {
    const button = [...host.querySelectorAll('button')].find((element) => element.textContent === text);
    assert.ok(button);
    await act(async () => { button.click(); });
  };
  try {
    await act(async () => { root.render(createElement(Harness)); });
    await select();
    assert.deepEqual(busy, [true]);
    assert.match(host.textContent ?? '', /Preparing/);
    assert.equal(host.querySelector<HTMLInputElement>('input[type=file]')?.validity.valid, false);
    await select('new.png');
    await act(async () => { decodes[1]!(); });
    const latest = files.at(-1);
    assert.ok(latest instanceof Blob);
    assert.deepEqual(busy, [true, false]);
    await act(async () => { decodes[0]!(); });
    assert.equal(files.length, 1, 'An older decode must not overwrite the latest selection.');
    assert.deepEqual(paths, []);
    assert.equal(host.querySelector('img')?.getAttribute('src'), created[0]);
    await select('invalid.svg', 'image/svg+xml');
    assert.match(host.querySelector('[role=alert]')?.textContent ?? '', /PNG, JPEG, or WebP/);
    assert.equal(files.at(-1), latest, 'Invalid replacements retain the last usable upload.');
    assert.deepEqual(busy.slice(-2), [true, false]);
    await select();
    await act(async () => { decodes[2]!(); });
    assert.deepEqual(revoked, [created[0]]);
    await act(async () => { reset?.(); });
    assert.equal(host.querySelector('img')?.getAttribute('src'), '/profile/saved.jpg');
    assert.deepEqual(revoked, created);
    await select();
    await click('Revert upload');
    assert.equal(busy.at(-1), false);
    await act(async () => { decodes[3]!(); });
    assert.equal(files.at(-1), null, 'Reverting cancels an in-flight preparation.');
    await click('Remove photo');
    assert.equal(paths.at(-1), '');
    assert.equal(host.querySelector('img'), null);
    await select();
    await act(async () => { decodes[4]!(); });
    await select();
    const beforeUnmount = files.length;
    await act(async () => { root.unmount(); });
    assert.equal(busy.at(-1), false);
    const busyBeforeCompletion = busy.length;
    await act(async () => { decodes[5]!(); });
    assert.equal(files.length, beforeUnmount);
    assert.equal(busy.length, busyBeforeCompletion);
    assert.deepEqual(revoked, created);
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    dom.window.close();
    restore();
  }
});
