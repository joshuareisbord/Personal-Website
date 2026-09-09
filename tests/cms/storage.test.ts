import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { deleteObject, getBytes, listAll, ref, updateMetadata, uploadBytes } from 'firebase/storage';

const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;

describe('Owner photo Storage rules', { skip: !firestoreHost || !storageHost, concurrency: false }, () => {
  let environment: RulesTestEnvironment;
  before(async () => {
    const endpoint = (host: string) => {
      const url = new URL(`http://${host}`);
      assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
      return { host: url.hostname, port: Number(url.port) };
    };
    environment = await initializeTestEnvironment({
      projectId: 'demo-personal-website',
      firestore: { ...endpoint(firestoreHost!), rules: await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8') },
      storage: { ...endpoint(storageHost!), rules: await readFile(new URL('../../storage.rules', import.meta.url), 'utf8') },
    });
  });
  after(async () => { await environment?.cleanup(); });
  beforeEach(async () => {
    await environment.clearFirestore(); await environment.clearStorage();
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'websiteOwners/alice@example.test'), { enabled: true });
    });
  });
  const user = (uid = 'alice', email = 'Alice@Example.Test', verified = true, provider: 'google.com' | 'password' = 'google.com') => environment.authenticatedContext(uid, {
    email, email_verified: verified, firebase: { sign_in_provider: provider, identities: {} },
  });
  const path = (uid = 'alice') => `website-profile/${uid}/${crypto.randomUUID()}.jpg`;
  const jpeg = new Uint8Array([255, 216, 255, 217]);
  const metadata = { contentType: 'image/jpeg' };

  test('approved Google owners upload; signed-out visitors can read but cannot list', async () => {
    const name = path();
    await assertSucceeds(uploadBytes(ref(user().storage(), name), jpeg, metadata));
    const publicStorage = environment.unauthenticatedContext().storage();
    assert.equal((await assertSucceeds(getBytes(ref(publicStorage, name)))).byteLength, jpeg.byteLength);
    await assertFails(listAll(ref(publicStorage, 'website-profile')));
    await assertFails(listAll(ref(user().storage(), 'website-profile/alice')));
  });

  test('public, unapproved, unverified, and non-Google accounts cannot upload', async () => {
    for (const context of [environment.unauthenticatedContext(), user('outsider', 'other@example.test'), user('alice', 'alice@example.test', false), user('alice', 'alice@example.test', true, 'password')]) {
      await assertFails(uploadBytes(ref(context.storage(), path()), jpeg, metadata));
    }
    await assertFails(uploadBytes(ref(user().storage(), path('someone-else')), jpeg, metadata));
    await assertFails(uploadBytes(ref(user().storage(), 'website-profile/loose.jpg'), jpeg, metadata));
  });

  test('invalid types, empty files, oversized files and names are rejected', async () => {
    const storage = user().storage();
    await assertFails(uploadBytes(ref(storage, path()), jpeg, { contentType: 'image/svg+xml' }));
    await assertFails(uploadBytes(ref(storage, path()), new Uint8Array(0), metadata));
    await assertFails(uploadBytes(ref(storage, path()), new Uint8Array(1_048_577), metadata));
    await assertFails(uploadBytes(ref(storage, 'website-profile/alice/photo.png'), jpeg, metadata));
    await assertSucceeds(uploadBytes(ref(storage, path()), new Uint8Array(1_048_576), metadata));
  });

  test('replacements use new objects; nobody can overwrite or delete published photos', async () => {
    const target = ref(user().storage(), path());
    await assertSucceeds(uploadBytes(target, jpeg, metadata));
    await assertFails(uploadBytes(target, jpeg, metadata));
    await assertFails(updateMetadata(target, { contentType: 'text/html' }));
    await assertFails(deleteObject(target));
    await assertFails(deleteObject(ref(environment.unauthenticatedContext().storage(), target.fullPath)));
  });

  test('revocation and malformed owner records immediately block new uploads', async () => {
    await environment.withSecurityRulesDisabled(async (context) => { await deleteDoc(doc(context.firestore(), 'websiteOwners/alice@example.test')); });
    await assertFails(uploadBytes(ref(user().storage(), path()), jpeg, metadata));
    await environment.withSecurityRulesDisabled(async (context) => { await setDoc(doc(context.firestore(), 'websiteOwners/alice@example.test'), { enabled: true, extra: 'invalid' }); });
    await assertFails(uploadBytes(ref(user().storage(), path()), jpeg, metadata));
  });

  test('legacy paths retain existing authenticated access without opening the upload prefix', async () => {
    const storage = user('legacy', 'legacy@example.test').storage();
    for (const name of ['old-photo.png', 'legacy/photos/old.png']) {
      await assertSucceeds(uploadBytes(ref(storage, name), jpeg, { contentType: 'image/png' }));
      await assertSucceeds(deleteObject(ref(storage, name)));
    }
    await assertFails(uploadBytes(ref(storage, path('legacy')), jpeg, metadata));
    await assertFails(uploadBytes(ref(environment.unauthenticatedContext().storage(), 'legacy.png'), jpeg, metadata));
  });
});
