import assert from 'node:assert/strict';
import test from 'node:test';

import { JSDOM } from 'jsdom';
import { act, createElement, useState } from 'react';

import { MonthPicker, type MonthPickerProps } from '../../src/components/month-picker.tsx';
import { formatExperienceDate } from '../../src/lib/dates.ts';

test('experience dates show full months without guessing missing or malformed months', () => {
  assert.equal(formatExperienceDate('2024-03'), 'March, 2024');
  assert.equal(formatExperienceDate('2024-01'), 'January, 2024');
  assert.equal(formatExperienceDate('2024-12'), 'December, 2024');
  assert.equal(formatExperienceDate('2024'), '2024');
  assert.equal(formatExperienceDate(''), 'Present');
  for (const value of ['2024-00', '2024-13', '2024-3', 'not a date', '2024-03-01']) {
    assert.equal(formatExperienceDate(value), value);
  }
});

async function mountPicker(props: Omit<MonthPickerProps, 'onChange'>) {
  const dom = new JSDOM('<div id="test"></div>', { pretendToBeVisual: true });
  const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true };
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  const { createRoot } = await import('react-dom/client');
  const host = dom.window.document.getElementById('test')!;
  const root = createRoot(host);
  const changes: string[] = [];
  let submissions = 0;
  function Harness() {
    const [value, setValue] = useState(props.value);
    return createElement('form', { onSubmit: (event) => { event.preventDefault(); submissions++; } },
      createElement('fieldset', null, createElement(MonthPicker, { ...props, value, onChange: (next) => { changes.push(next); setValue(next); } })),
      createElement('button', { type: 'submit' }, 'Save'));
  }
  await act(async () => { root.render(createElement(Harness)); });
  const button = (text: string): HTMLButtonElement => {
    const found = [...host.querySelectorAll('button')].find((element) => element.textContent?.trim() === text || element.getAttribute('aria-label') === text);
    assert.ok(found, `Missing button: ${text}`);
    return found;
  };
  const click = async (text: string): Promise<void> => { await act(async () => { button(text).click(); }); };
  const press = async (element: Element, key: string): Promise<void> => {
    await act(async () => { element.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true })); });
  };
  const setYear = async (value: string): Promise<void> => {
    const input = host.querySelector<HTMLInputElement>('input[inputmode="numeric"]');
    assert.ok(input);
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
  };
  return {
    host, dom, changes, button, click, press, setYear,
    submissions: () => submissions,
    form: host.querySelector('form')!,
    close: async () => {
      await act(async () => { root.unmount(); });
      dom.window.close();
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

test('browsing years preserves legacy precision until a month is explicitly selected', async () => {
  const view = await mountPicker({ label: 'Start date', value: '2024' });
  try {
    await view.click('Start date: 2024');
    assert.equal(view.host.querySelectorAll('[aria-pressed="true"]').length, 0);
    await view.setYear('2025');
    assert.deepEqual(view.changes, []);
    await view.press(view.button('March, 2025'), 'Escape');
    assert.equal(view.host.querySelector('[role="group"]'), null);
    assert.equal(view.dom.window.document.activeElement, view.button('Start date: 2024'));
    await view.click('Start date: 2024');
    await view.click('March, 2024');
    assert.deepEqual(view.changes, ['2024-03']);
    assert.equal(view.dom.window.document.activeElement, view.button('Start date: March, 2024'));
    assert.equal(view.submissions(), 0, 'Picker buttons must never submit the form.');
  } finally { await view.close(); }
});

test('month buttons support arrow navigation and retain an explicit selected state', async () => {
  const view = await mountPicker({ label: 'Start date', value: '2024-03' });
  try {
    await view.click('Start date: March, 2024');
    const march = view.button('March, 2024');
    assert.equal(march.getAttribute('aria-pressed'), 'true');
    assert.equal(view.dom.window.document.activeElement, march);
    await view.press(march, 'ArrowDown');
    assert.equal(view.dom.window.document.activeElement, view.button('June, 2024'));
    await view.press(view.button('June, 2024'), 'Home');
    assert.equal(view.dom.window.document.activeElement, view.button('January, 2024'));
    await view.press(view.button('January, 2024'), 'End');
    assert.equal(view.dom.window.document.activeElement, view.button('December, 2024'));
    assert.deepEqual(view.changes, []);
  } finally { await view.close(); }
});

test('required dates block native submission, then a selected month allows it', async () => {
  const view = await mountPicker({ label: 'Start date', value: '' });
  try {
    await act(async () => { view.form.requestSubmit(); });
    assert.equal(view.submissions(), 0);
    assert.match(view.host.querySelector('[role="alert"]')?.textContent ?? '', /Choose/);
    assert.equal(view.dom.window.document.activeElement, view.button('Start date: Choose month and year'));
    await view.click('Start date: Choose month and year');
    await view.setYear('2024');
    await view.click('March, 2024');
    await act(async () => { view.form.requestSubmit(); });
    assert.equal(view.submissions(), 1);
    assert.equal(view.host.querySelector('[role="alert"]'), null);
  } finally { await view.close(); }
});

test('optional end dates can be cleared to Present and inherit disabled fieldsets', async () => {
  const view = await mountPicker({ label: 'End date', value: '2024-03', required: false });
  try {
    const fieldset = view.host.querySelector('fieldset')!;
    fieldset.disabled = true;
    await view.click('End date: March, 2024');
    assert.equal(view.host.querySelector('[role="group"]'), null);
    fieldset.disabled = false;
    await view.click('End date: March, 2024');
    await view.click('Clear date / Present');
    assert.deepEqual(view.changes, ['']);
    assert.ok(view.button('End date: Present'));
    await act(async () => { view.form.requestSubmit(); });
    assert.equal(view.submissions(), 1);
  } finally { await view.close(); }
});

test('minimum dates constrain month selection and native validation without inventing precision', async () => {
  const view = await mountPicker({ label: 'End date', value: '2024', required: false, min: '2024-03' });
  try {
    assert.equal(view.form.checkValidity(), true, 'Unknown end month may overlap the start month.');
    await view.click('End date: 2024');
    assert.equal(view.button('February, 2024').disabled, true);
    assert.equal(view.button('March, 2024').disabled, false);
    await view.click('February, 2024');
    assert.deepEqual(view.changes, []);
    await view.setYear('2023');
    assert.equal(view.button('December, 2023').disabled, true);
    await view.setYear('');
    assert.equal(view.button('March').disabled, true);
    await view.setYear('2025');
    await view.click('January, 2025');
    assert.deepEqual(view.changes, ['2025-01']);
  } finally { await view.close(); }
  const invalid = await mountPicker({ label: 'End date', value: '2024-02', min: '2024-03' });
  try {
    await act(async () => { invalid.form.requestSubmit(); });
    assert.equal(invalid.submissions(), 0);
    assert.match(invalid.host.querySelector('[role="alert"]')?.textContent ?? '', /March, 2024/);
  } finally { await invalid.close(); }
});
