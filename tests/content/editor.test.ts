import assert from 'node:assert/strict';
import test from 'node:test';

import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';

import { ContentEditor } from '../../src/components/content-editor.tsx';
import { initialContent } from '../../src/data/content.ts';
import { parseContent, type SiteContent } from '../../src/lib/content.ts';
import { PHOTO_OUTPUT_TYPE } from '../../src/lib/photo-upload.ts';

test('publishing disables draft inputs and ignores completion after the owner editor unmounts', async () => {
  const dom = new JSDOM('<div id="test"></div>');
  const globals = {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  const host = dom.window.document.getElementById('test');
  assert.ok(host);
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(host);
  const dirtyCalls: boolean[] = [];
  let resolveSave: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    resolveSave = resolve;
  });
  try {
    await act(async () => {
      root.render(
        createElement(ContentEditor, {
          initial: initialContent,
          onSave: () => pending,
          onDirty: (value) => dirtyCalls.push(value),
        }),
      );
    });
    await act(async () => {
      host.querySelector('form')?.requestSubmit();
    });
    assert.equal(host.querySelector('fieldset')?.disabled, true);
    assert.match(host.textContent ?? '', /Publishing/);
    await act(async () => {
      root.unmount();
    });
    await act(async () => {
      resolveSave?.();
      await pending;
    });
    assert.deepEqual(dirtyCalls, [], 'Old save completion must not clear another owner draft.');
  } finally {
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test('photo preparation blocks publication; failed uploads retain the draft for retry, then saved URLs and removal publish correctly', async () => {
  const dom = new JSDOM('<div id="test"></div>', { url: 'https://example.com' });
  let finishDecode: (() => void) | undefined;
  const decoded = new Promise<{ width: number; height: number; close: () => void }>((resolve) => {
    finishDecode = () => resolve({ width: 2400, height: 1600, close: () => {} });
  });
  const prepared = new Blob(['prepared JPEG fixture'], { type: PHOTO_OUTPUT_TYPE });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
    createImageBitmap: () => decoded,
  };
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  Object.defineProperty(dom.window.HTMLElement.prototype, 'scrollIntoView', { value: () => {} });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, 'getContext', {
    value: () => ({ fillRect: () => {}, drawImage: () => {} }),
  });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, 'toBlob', {
    value: (callback: BlobCallback) => {
      callback(prepared);
    },
  });
  const initial = structuredClone(initialContent);
  initial.profile.photo = { path: 'https://example.com/original.jpg', alt: 'Original portrait' };
  const dirtyCalls: boolean[] = [];
  const saves: Array<{ content: SiteContent; photo: Blob | undefined }> = [];
  const savedUrl = 'https://example.com/uploaded-portrait.jpg';
  let rejectFirstSave: ((error: Error) => void) | undefined;
  const firstSave = new Promise<SiteContent>((_resolve, reject) => {
    rejectFirstSave = reject;
  });
  const onSave = async (content: SiteContent, photo?: Blob): Promise<SiteContent> => {
    saves.push({ content, photo });
    if (saves.length === 1) return firstSave;
    return photo
      ? {
          ...content,
          profile: {
            ...content.profile,
            photo: { path: savedUrl, alt: content.profile.photo!.alt },
          },
        }
      : content;
  };
  const host = dom.window.document.getElementById('test')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(host);
  const field = (label: string): HTMLInputElement => {
    const element = [...host.querySelectorAll('label')].find(
      (entry) => entry.textContent === label,
    );
    assert.ok(element, `Missing field: ${label}`);
    const control = dom.window.document.getElementById(element.htmlFor);
    assert.ok(control instanceof dom.window.HTMLInputElement);
    return control;
  };
  const type = async (label: string, value: string): Promise<void> => {
    const control = field(label);
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(
        control,
        value,
      );
      control.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
  };
  const submit = async (): Promise<void> => {
    await act(async () => {
      host.querySelector('form')!.requestSubmit();
    });
  };
  const saveButton = (): HTMLButtonElement =>
    host.querySelector<HTMLButtonElement>('button[type=submit]')!;
  try {
    await act(async () => {
      root.render(
        createElement(ContentEditor, {
          initial,
          onSave,
          onDirty: (value) => {
            dirtyCalls.push(value);
          },
        }),
      );
    });
    await type('Name', 'Edited owner name');
    await type('Photo description', 'Updated portrait description');
    const upload = field('Upload photo');
    const selected = new File(['source PNG fixture'], 'portrait.png', { type: 'image/png' });
    Object.defineProperty(upload, 'files', { value: [selected], configurable: true });
    await act(async () => {
      upload.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    });
    assert.equal(saveButton().disabled, true);
    assert.match(saveButton().textContent ?? '', /Preparing photo/);
    await submit();
    assert.equal(
      saves.length,
      0,
      'Native validation must block submission while preparation is pending.',
    );
    await act(async () => {
      host
        .querySelector('form')!
        .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    });
    assert.equal(
      saves.length,
      0,
      'The submit handler must also guard against bypassing native validation.',
    );

    await act(async () => {
      finishDecode?.();
      await decoded;
    });
    assert.equal(saveButton().disabled, false);
    const pendingPreview = host.querySelector('img')!.getAttribute('src');
    assert.match(pendingPreview ?? '', /^blob:/);
    await submit();
    assert.equal(saves.length, 1);
    const first = saves[0]!;
    assert.equal(
      first.photo,
      prepared,
      'The save callback receives the prepared Blob, not the original File.',
    );
    assert.notEqual(first.photo, selected);
    assert.deepEqual(parseContent(first.content), first.content);
    assert.equal(first.content.profile.name, 'Edited owner name');
    assert.equal(first.content.profile.photo?.alt, 'Updated portrait description');
    assert.doesNotMatch(JSON.stringify(first.content), /(?:blob:|data:)/);
    assert.equal(
      upload.matches(':disabled'),
      true,
      'The outer fieldset disables the file control during publication.',
    );

    await act(async () => {
      rejectFirstSave?.(new Error('Upload failed. Please retry.'));
    });
    assert.match(
      host.querySelector('[role=alert]')?.textContent ?? '',
      /Upload failed\. Please retry\./,
    );
    assert.equal(saveButton().disabled, false);
    assert.equal(host.querySelector('img')?.getAttribute('src'), pendingPreview);
    assert.equal(field('Name').value, 'Edited owner name');
    assert.equal(field('Photo description').value, 'Updated portrait description');
    assert.equal(dirtyCalls.at(-1), true);
    assert.equal(dirtyCalls.includes(false), false, 'A failed save must not mark the draft clean.');

    await submit();
    assert.equal(saves.length, 2);
    assert.equal(saves[1]!.photo, prepared, 'Retry reuses the same prepared upload.');
    assert.deepEqual(
      saves[1]!.content,
      first.content,
      'Retry preserves the entire authored draft.',
    );
    assert.equal(field('Or use a photo link').value, savedUrl);
    assert.equal(host.querySelector('img')?.getAttribute('src'), savedUrl);
    assert.equal(host.querySelector('[role=alert]'), null);
    assert.equal(
      [...host.querySelectorAll('button')].some((button) => button.textContent === 'Revert upload'),
      false,
    );
    assert.equal(dirtyCalls.at(-1), false);
    assert.match(host.textContent ?? '', /Published\. Your website is updated\./);

    await submit();
    assert.equal(saves.length, 3);
    assert.equal(saves[2]!.photo, undefined, 'A successful save clears the pending Blob.');
    assert.equal(
      saves[2]!.content.profile.photo?.path,
      savedUrl,
      'Later publication uses the returned HTTPS URL.',
    );
    const remove = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === 'Remove photo',
    );
    assert.ok(remove);
    await act(async () => {
      remove.click();
    });
    assert.equal(host.querySelector('img'), null);
    assert.equal(field('Or use a photo link').value, '');
    assert.equal(dirtyCalls.at(-1), true);
    await submit();
    assert.equal(saves.length, 4);
    assert.equal(saves[3]!.content.profile.photo, null);
    assert.equal(saves[3]!.photo, undefined);
    assert.equal(saves[3]!.content.profile.name, 'Edited owner name');
    assert.equal(dirtyCalls.at(-1), false);
  } finally {
    await act(async () => {
      root.unmount();
    });
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
