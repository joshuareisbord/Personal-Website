import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test, { type TestContext } from 'node:test';

import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';

import { initialContent } from '../../src/data/content';
import { parseContent, serializeContent, type SiteContent } from '../../src/lib/content';
import type { PhotoCrop } from '../../src/lib/photo-crop';
import { PHOTO_OUTPUT_TYPE } from '../../src/lib/photo-upload';

const originalCrop: PhotoCrop = { x: 12.5, y: 5, width: 60, height: 75 };
const appliedCrop: PhotoCrop = { x: 20, y: 12.5, width: 48, height: 60 };
const originalPath = 'https://example.com/original-crop.jpg';
const uploadedPath = 'https://example.com/uploaded-crop.jpg';

// Stub only the image-geometry boundary. Editor/picker state, validation, uploads, and save callbacks stay real.
// Node's test runner isolates this file; the loader hook is removed immediately after importing the editor.
const cropperUrl = new URL('../../src/components/photo-cropper.tsx', import.meta.url).href;
const hook = registerHooks({
  load(url, context, nextLoad) {
    if (url === cropperUrl)
      return {
        format: 'module',
        shortCircuit: true,
        source: `
      import { createElement } from ${JSON.stringify(import.meta.resolve('react'))};
      export function PhotoCropper({ onApply, onCancel }) {
        return createElement('div', { 'aria-label': 'Crop geometry fixture' },
          createElement('button', { type: 'button', onClick: () => onApply(${JSON.stringify(appliedCrop)}) }, 'Apply fixture crop'),
          createElement('button', { type: 'button', onClick: onCancel }, 'Cancel fixture crop'));
      }
    `,
      };
    return nextLoad(url, context);
  },
});
const { ContentEditor } = await import('../../src/components/content-editor');
hook.deregister();

async function mountEditor(context: TestContext) {
  const dom = new JSDOM('<div id="test"></div>', {
    url: 'https://example.com',
    pretendToBeVisual: true,
  });
  const initial = parseContent({
    ...initialContent,
    profile: {
      ...initialContent.profile,
      experience: [],
      photo: { path: originalPath, alt: 'Original portrait', crop: originalCrop },
    },
  });
  const prepared = new Blob(['prepared JPEG fixture'], { type: PHOTO_OUTPUT_TYPE });
  const dirty: boolean[] = [];
  const saves: { content: SiteContent; photo: Blob | undefined }[] = [];
  const revoked: string[] = [];
  let nextFailure = false;
  let blobSequence = 0;
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
    createImageBitmap: async () => ({ width: 1600, height: 2000, close: () => {} }),
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  context.mock.method(URL, 'createObjectURL', () => `blob:crop-preview-${++blobSequence}`);
  context.mock.method(URL, 'revokeObjectURL', (url: string) => {
    revoked.push(url);
  });
  Object.defineProperty(dom.window.HTMLElement.prototype, 'scrollIntoView', { value: () => {} });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, 'getContext', {
    value: () => ({ fillRect: () => {}, drawImage: () => {} }),
  });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, 'toBlob', {
    value: (callback: BlobCallback) => callback(prepared),
  });
  const { createRoot } = await import('react-dom/client');
  const host = dom.window.document.getElementById('test')!;
  const root = createRoot(host);
  context.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  const onSave = async (content: SiteContent, photo?: Blob): Promise<SiteContent> => {
    saves.push({ content, photo });
    if (nextFailure) {
      nextFailure = false;
      throw new Error('Fixture upload failed. Retry publication.');
    }
    return parseContent(
      photo
        ? {
            ...content,
            profile: {
              ...content.profile,
              photo: { ...content.profile.photo, path: uploadedPath },
            },
          }
        : content,
    );
  };
  await act(async () =>
    root.render(
      createElement(ContentEditor, { initial, onSave, onDirty: (value) => dirty.push(value) }),
    ),
  );
  const field = (label: string): HTMLInputElement => {
    const element = [...host.querySelectorAll('label')].find(
      (entry) => entry.textContent === label,
    );
    assert.ok(element, `Missing field: ${label}`);
    const control = dom.window.document.getElementById(element.htmlFor);
    assert.ok(control instanceof dom.window.HTMLInputElement);
    return control;
  };
  const hasButton = (label: string): boolean =>
    [...host.querySelectorAll('button')].some((button) => button.textContent === label);
  const click = async (label: string): Promise<void> => {
    const button = [...host.querySelectorAll('button')].find(
      (entry) => entry.textContent === label,
    );
    assert.ok(button, `Missing button: ${label}`);
    await act(async () => button.click());
  };
  const type = async (label: string, value: string): Promise<void> => {
    const input = field(label);
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(
        input,
        value,
      );
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
  };
  const selectUpload = async (): Promise<void> => {
    const input = field('Upload photo');
    Object.defineProperty(input, 'files', {
      value: [new File(['source PNG fixture'], 'portrait.png', { type: 'image/png' })],
      configurable: true,
    });
    await act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
    assert.match(host.textContent!, /Photo ready/);
  };
  const submit = async (): Promise<void> => {
    await act(async () => host.querySelector('form')!.requestSubmit());
  };
  return {
    initial,
    host,
    dirty,
    saves,
    prepared,
    revoked,
    field,
    hasButton,
    click,
    type,
    selectUpload,
    submit,
    failNextSave: () => {
      nextFailure = true;
    },
  };
}

test('existing crop survives unrelated edits, publication, and subsequent saves', async (context) => {
  const view = await mountEditor(context);
  assert.ok(view.hasButton('Reset crop'));
  await view.type('Name', 'Edited owner');
  await view.submit();
  assert.equal(view.saves.length, 1);
  assert.deepEqual(view.saves[0]!.content.profile.photo, {
    path: originalPath,
    alt: 'Original portrait',
    crop: originalCrop,
  });
  assert.equal(view.saves[0]!.photo, undefined);
  assert.deepEqual(
    parseContent(JSON.parse(serializeContent(view.saves[0]!.content))),
    view.saves[0]!.content,
  );
  assert.equal(view.dirty.at(-1), false);
  await view.type('Photo description', 'Updated portrait description');
  await view.submit();
  assert.deepEqual(view.saves[1]!.content.profile.photo, {
    path: originalPath,
    alt: 'Updated portrait description',
    crop: originalCrop,
  });
  assert.equal(view.saves[1]!.content.profile.name, 'Edited owner');
  assert.deepEqual(
    view.initial.profile.photo?.crop,
    originalCrop,
    'Editing must not mutate the published input.',
  );
});

test('resetting a crop makes the draft dirty and publishes without stale crop metadata', async (context) => {
  const view = await mountEditor(context);
  await view.click('Reset crop');
  assert.equal(view.dirty.at(-1), true);
  assert.match(view.host.textContent!, /Unsaved changes/);
  assert.equal(view.hasButton('Reset crop'), false);
  await view.submit();
  assert.deepEqual(view.saves[0]!.content.profile.photo, {
    path: originalPath,
    alt: 'Original portrait',
  });
  assert.equal(Object.hasOwn(view.saves[0]!.content.profile.photo!, 'crop'), false);
  assert.equal(view.dirty.at(-1), false);
  await view.type('Name', 'Edit after reset');
  await view.submit();
  assert.equal(
    Object.hasOwn(view.saves[1]!.content.profile.photo!, 'crop'),
    false,
    'A later save must not resurrect the original crop.',
  );
});

test('changing a photo link clears its crop while preserving the description and other edits', async (context) => {
  const view = await mountEditor(context);
  await view.type('Name', 'Owner with a new photo');
  await view.type('Or use a photo link', 'https://example.com/replacement.jpg');
  assert.equal(view.hasButton('Reset crop'), false);
  assert.equal(view.dirty.at(-1), true);
  await view.submit();
  assert.deepEqual(view.saves[0]!.content.profile.photo, {
    path: 'https://example.com/replacement.jpg',
    alt: 'Original portrait',
  });
  assert.equal(view.saves[0]!.content.profile.name, 'Owner with a new photo');
  assert.equal(view.saves[0]!.photo, undefined);
});

test('a new upload clears the old crop and reverting restores the original source and crop', async (context) => {
  const view = await mountEditor(context);
  await view.selectUpload();
  assert.equal(view.hasButton('Reset crop'), false);
  const preview = view.host.querySelector('img')!.getAttribute('src')!;
  assert.match(preview, /^blob:/);
  await view.click('Revert upload');
  assert.ok(view.hasButton('Reset crop'));
  assert.equal(view.host.querySelector('img')?.getAttribute('src'), originalPath);
  assert.ok(view.revoked.includes(preview));
  await view.submit();
  assert.deepEqual(view.saves[0]!.content.profile.photo, {
    path: originalPath,
    alt: 'Original portrait',
    crop: originalCrop,
  });
  assert.equal(view.saves[0]!.photo, undefined);
});

test('reverting an upload after changing the link does not attach the previous photo crop to the new source', async (context) => {
  const view = await mountEditor(context);
  const replacement = 'https://example.com/new-source-before-upload.jpg';
  await view.type('Or use a photo link', replacement);
  await view.selectUpload();
  await view.click('Revert upload');
  assert.equal(view.hasButton('Reset crop'), false);
  assert.equal(view.host.querySelector('img')?.getAttribute('src'), replacement);
  await view.submit();
  assert.deepEqual(view.saves[0]!.content.profile.photo, {
    path: replacement,
    alt: 'Original portrait',
  });
  assert.equal(view.saves[0]!.photo, undefined);
});

test('a crop applied to a prepared upload survives failed save, retry, returned URL, and later publication', async (context) => {
  const view = await mountEditor(context);
  await view.selectUpload();
  await view.click('Crop photo');
  assert.ok(
    view.host.querySelector('[aria-label="Crop geometry fixture"]'),
    'This lifecycle test must use the fixture, not real crop geometry.',
  );
  await view.click('Apply fixture crop');
  assert.equal(view.dirty.at(-1), true);
  assert.ok(view.hasButton('Reset crop'));
  view.failNextSave();
  await view.submit();
  assert.equal(view.saves[0]!.photo, view.prepared);
  assert.deepEqual(view.saves[0]!.content.profile.photo?.crop, appliedCrop);
  assert.doesNotMatch(serializeContent(view.saves[0]!.content), /blob:|data:/);
  assert.match(view.host.querySelector('[role="alert"]')!.textContent!, /Fixture upload failed/);
  assert.equal(view.dirty.at(-1), true);
  await view.submit();
  assert.equal(view.saves[1]!.photo, view.prepared);
  assert.deepEqual(view.saves[1]!.content, view.saves[0]!.content);
  assert.equal(view.field('Or use a photo link').value, uploadedPath);
  assert.equal(view.hasButton('Revert upload'), false);
  assert.equal(view.dirty.at(-1), false);
  assert.ok(view.hasButton('Reset crop'));
  await view.type('Photo description', 'Published cropped portrait');
  await view.submit();
  assert.equal(
    view.saves[2]!.photo,
    undefined,
    'Successful publication consumes the pending Blob.',
  );
  assert.deepEqual(view.saves[2]!.content.profile.photo, {
    path: uploadedPath,
    alt: 'Published cropped portrait',
    crop: appliedCrop,
  });
});
