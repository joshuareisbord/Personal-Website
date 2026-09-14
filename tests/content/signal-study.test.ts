import assert from 'node:assert/strict';
import test from 'node:test';

import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import { SignalStudy } from '../../src/components/signal-study';

test('idle motion accelerates with scrolling, reverses upward, and pauses when not visible or reduced', async () => {
  const dom = new JSDOM(`<div id="test">${renderToString(createElement(SignalStudy))}</div>`, {
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window,
    document: window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
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
  window.requestAnimationFrame = (callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  };
  window.cancelAnimationFrame = (id) => {
    frames.delete(id);
  };
  Object.defineProperty(window.performance, 'now', { value: () => now });
  const host = window.document.getElementById('test')!;
  const region = host.firstElementChild!;
  let visible = true;
  region.getBoundingClientRect = () => ({
    top: visible ? 150 : -500,
    bottom: visible ? 550 : -100,
    height: 400,
    width: 1400,
    left: 0,
    right: 1400,
    x: 0,
    y: 150,
    toJSON: () => ({}),
  });
  const drawing = host.querySelector('g[transform]')!;
  const initial = drawing.getAttribute('transform');
  const angle = (): number =>
    Number(drawing.getAttribute('transform')?.match(/rotate\(([^)]+)\)/)?.[1]);
  const advance = (): void => {
    now += 16;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(now));
  };
  const scroll = (top: number): void => {
    Object.defineProperty(window, 'scrollY', { value: top, configurable: true });
    window.dispatchEvent(new window.Event('scroll'));
  };
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => {
      root = hydrateRoot(host, createElement(SignalStudy));
    });
    assert.equal(frames.size, 1, 'Visible graphics start one idle animation loop.');
    assert.equal(drawing.getAttribute('transform'), initial);
    advance();
    assert.equal(
      drawing.getAttribute('transform'),
      initial,
      'The first frame must preserve the server pose.',
    );
    advance();
    const idleStep = angle() + 24;
    assert.ok(idleStep > 0 && idleStep < 0.02, 'Idle motion must be slow and forward.');
    const beforeScroll = drawing.getAttribute('transform');
    scroll(200);
    assert.equal(
      drawing.getAttribute('transform'),
      beforeScroll,
      'Scrolling must not synchronously jump the drawing.',
    );
    assert.equal(frames.size, 1);
    const beforeDown = angle();
    advance();
    assert.ok(angle() - beforeDown > idleStep * 2, 'Downward scrolling accelerates forward.');
    scroll(100);
    const beforeUp = angle();
    advance();
    assert.ok(
      angle() < beforeUp,
      'Upward scrolling reverses motion immediately on the next frame.',
    );
    for (let frame = 0; frame < 180; frame++) advance();
    const afterCoast = angle();
    advance();
    assert.ok(
      Math.abs(angle() - afterCoast - idleStep) < 0.001,
      'Scroll momentum settles back to idle speed.',
    );
    const beforeResize = drawing.getAttribute('transform');
    window.dispatchEvent(new window.Event('resize'));
    assert.equal(
      drawing.getAttribute('transform'),
      beforeResize,
      'Resizing preserves the current pose.',
    );
    for (let offset = 210; offset <= 300; offset += 10) scroll(offset);
    assert.equal(frames.size, 1, 'Rapid scroll events share one animation frame.');
    visible = false;
    scroll(1000);
    assert.equal(frames.size, 0, 'Offscreen graphics pause.');
    const paused = drawing.getAttribute('transform');
    now += 60_000;
    visible = true;
    scroll(200);
    advance();
    assert.equal(
      drawing.getAttribute('transform'),
      paused,
      'Returning onscreen does not jump ahead.',
    );
    Object.defineProperty(window.document, 'hidden', { value: true, configurable: true });
    window.document.dispatchEvent(new window.Event('visibilitychange'));
    assert.equal(frames.size, 0, 'Hidden tabs pause.');
    Object.defineProperty(window.document, 'hidden', { value: false, configurable: true });
    window.document.dispatchEvent(new window.Event('visibilitychange'));
    assert.equal(frames.size, 1);
    reduced = true;
    preference.dispatchEvent(new window.Event('change'));
    assert.equal(frames.size, 0);
    assert.equal(
      drawing.getAttribute('transform'),
      paused,
      'Enabling reduced motion freezes the current pose without a jump.',
    );
    scroll(400);
    assert.equal(frames.size, 0);
    reduced = false;
    preference.dispatchEvent(new window.Event('change'));
    assert.equal(frames.size, 1, 'Re-enabling motion resumes idle animation.');
    scroll(500);
    assert.equal(frames.size, 1);
    await act(async () => {
      root?.unmount();
      root = undefined;
    });
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
