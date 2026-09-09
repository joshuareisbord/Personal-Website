import assert from 'node:assert/strict';
import test from 'node:test';

import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import { SignalStudy } from '../../src/components/signal-study';

test('scroll motion keeps its server pose on load, eases user scrolling, and respects reduced motion', async () => {
  const dom = new JSDOM(`<div id="test">${renderToString(createElement(SignalStudy))}</div>`);
  const { window } = dom;
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window, document: window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  let reduced = false;
  const preference = new window.EventTarget();
  Object.defineProperty(preference, 'matches', { get: () => reduced });
  Object.defineProperty(window, 'matchMedia', { value: () => preference });
  let now = 0;
  let nextFrame = 0;
  const frames = new Map<number, FrameRequestCallback>();
  window.requestAnimationFrame = (callback) => { frames.set(++nextFrame, callback); return nextFrame; };
  window.cancelAnimationFrame = (id) => { frames.delete(id); };
  Object.defineProperty(window.performance, 'now', { value: () => now });
  const host = window.document.getElementById('test')!;
  const region = host.firstElementChild!;
  region.getBoundingClientRect = () => ({ top: 150, bottom: 550, height: 400, width: 1400, left: 0, right: 1400, x: 0, y: 150, toJSON: () => ({}) });
  const drawing = host.querySelector('g[transform]')!;
  const initial = drawing.getAttribute('transform');
  const advance = (): void => {
    now += 16;
    const pending = [...frames.values()]; frames.clear();
    pending.forEach((callback) => callback(now));
  };
  const scroll = (top: number): void => {
    Object.defineProperty(window, 'scrollY', { value: top, configurable: true });
    window.dispatchEvent(new window.Event('scroll'));
  };
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => { root = hydrateRoot(host, createElement(SignalStudy)); });
    assert.equal(frames.size, 0, 'Hydration must not schedule an initial pose change.');
    assert.equal(drawing.getAttribute('transform'), initial);
    scroll(200);
    assert.equal(drawing.getAttribute('transform'), initial, 'A scroll must not synchronously jump the drawing.');
    assert.equal(frames.size, 1);
    advance();
    const firstFrame = drawing.getAttribute('transform');
    assert.notEqual(firstFrame, initial);
    for (let frame = 0; frame < 30; frame++) advance();
    const settled = drawing.getAttribute('transform');
    assert.notEqual(settled, firstFrame, 'Scrolling should ease across several frames.');
    assert.equal(frames.size, 0, 'Motion must stop after scrolling settles.');
    scroll(200);
    window.dispatchEvent(new window.Event('resize'));
    assert.equal(frames.size, 0, 'Unchanged scroll and resizing must not animate.');
    assert.equal(drawing.getAttribute('transform'), settled);
    for (let offset = 210; offset <= 300; offset += 10) scroll(offset);
    assert.equal(frames.size, 1, 'Rapid scroll events share one animation frame.');
    reduced = true;
    preference.dispatchEvent(new window.Event('change'));
    assert.equal(frames.size, 0);
    assert.equal(drawing.getAttribute('transform'), initial);
    scroll(400);
    assert.equal(frames.size, 0);
    reduced = false;
    preference.dispatchEvent(new window.Event('change'));
    assert.equal(frames.size, 0, 'Re-enabling motion must not animate until scrolling.');
    scroll(500);
    assert.equal(frames.size, 1);
    await act(async () => { root?.unmount(); root = undefined; });
    assert.equal(frames.size, 0);
    scroll(600);
    assert.equal(frames.size, 0, 'Unmount must remove scroll listeners.');
  } finally {
    if (root) await act(async () => root?.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
