import assert from 'node:assert/strict';
import test from 'node:test';

import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { ContentEditor } from '../../src/components/content-editor.tsx';
import { initialContent } from '../../src/data/content.ts';

test('publishing disables draft inputs and ignores completion after the owner editor unmounts', async () => {
  const dom = new JSDOM('<div id="test"></div>');
  const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true };
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  const host = dom.window.document.getElementById('test');
  assert.ok(host);
  const root = createRoot(host);
  const dirtyCalls: boolean[] = [];
  let resolveSave: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => { resolveSave = resolve; });
  try {
    await act(async () => { root.render(createElement(ContentEditor, { initial: initialContent, onSave: () => pending, onDirty: (value) => dirtyCalls.push(value) })); });
    await act(async () => { host.querySelector('form')?.requestSubmit(); });
    assert.equal(host.querySelector('fieldset')?.disabled, true);
    assert.match(host.textContent ?? '', /Publishing/);
    await act(async () => { root.unmount(); });
    await act(async () => { resolveSave?.(); await pending; });
    assert.deepEqual(dirtyCalls, [], 'Old save completion must not clear another owner draft.');
  } finally {
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
