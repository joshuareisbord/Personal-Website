import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, runTransaction, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';

const projectId = 'demo-personal-website';
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

describe('CMS Firestore access rules', { skip: !emulatorHost, concurrency: false }, () => {
  let environment: RulesTestEnvironment;

  before(async () => {
    const endpoint = new URL(`http://${emulatorHost}`);
    assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname), 'Rules tests require a local emulator.');
    environment = await initializeTestEnvironment({
      projectId,
      firestore: { host: endpoint.hostname, port: Number(endpoint.port), rules: await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8') },
    });
  });

  after(async () => { await environment?.cleanup(); });

  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'websiteOwners/alice@example.test'), { enabled: true });
      await setDoc(doc(db, 'websiteOwners/bob@example.test'), { enabled: true });
      await setDoc(doc(db, 'website/content'), { payload: '{}', revision: 1, updatedAt: Timestamp.now(), updatedBy: 'bootstrap' });
    });
  });

  const authenticated = (uid: string, email: string, verified = true, provider: 'google.com' | 'password' | 'custom' | 'anonymous' = 'google.com') => environment.authenticatedContext(uid, {
    email, email_verified: verified, firebase: { sign_in_provider: provider, identities: { 'google.com': [uid] } },
  }).firestore();

  test('public can get only content, with no collection listing or writes', async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'website/content')));
    await assertFails(getDocs(collection(db, 'website')));
    await assertFails(getDoc(doc(db, 'website/other')));
    await assertFails(getDoc(doc(db, 'websiteOwners/alice@example.test')));
    await assertFails(getDocs(collection(db, 'websiteOwners')));
    await assertFails(updateDoc(doc(db, 'website/content'), { payload: 'public edit', revision: 2, updatedAt: serverTimestamp(), updatedBy: 'public' }));
    await assertFails(setDoc(doc(db, 'other/document'), { enabled: true }));
  });

  test('verified Google owners can edit and case-normalized emails identify the same owner', async () => {
    for (const [uid, email, revision] of [['alice', 'Alice@Example.Test', 2], ['bob', 'bob@example.test', 3]] as const) {
      const db = authenticated(uid, email);
      await assertSucceeds(setDoc(doc(db, 'website/content'), { payload: '{"bio":"Updated"}', revision, updatedAt: serverTimestamp(), updatedBy: uid }));
      await assertSucceeds(getDocs(collection(db, 'websiteOwners')));
    }
  });

  test('unapproved users can read their own status but cannot enroll themselves or inspect others', async () => {
    const db = authenticated('outsider', 'outsider@example.test');
    await assertSucceeds(getDoc(doc(db, 'websiteOwners/outsider@example.test')));
    await assertFails(getDoc(doc(db, 'websiteOwners/alice@example.test')));
    await assertFails(getDocs(collection(db, 'websiteOwners')));
    await assertFails(setDoc(doc(db, 'websiteOwners/outsider@example.test'), { enabled: true }));
    await assertFails(setDoc(doc(db, 'website/content'), { payload: '{}', revision: 2, updatedAt: serverTimestamp(), updatedBy: 'outsider' }));
    await environment.clearFirestore();
    await assertFails(setDoc(doc(db, 'websiteOwners/outsider@example.test'), { enabled: true }));
  });

  test('unverified or non-Google sign-in cannot use owner privileges even with a linked Google identity', async () => {
    for (const [verified, provider] of [[false, 'google.com'], [true, 'password'], [true, 'custom'], [true, 'anonymous']] as const) {
      const db = authenticated('alice', 'alice@example.test', verified, provider);
      await assertFails(setDoc(doc(db, 'website/content'), { payload: '{}', revision: 2, updatedAt: serverTimestamp(), updatedBy: 'alice' }));
      await assertFails(setDoc(doc(db, 'websiteOwners/new@example.test'), { enabled: true }));
      await assertFails(getDocs(collection(db, 'websiteOwners')));
    }
  });

  test('owners add/delete other owners, while self-removal and invalid owner documents are denied', async () => {
    const db = authenticated('alice', 'Alice@Example.Test');
    await assertSucceeds(setDoc(doc(db, 'websiteOwners/carol@example.test'), { enabled: true }));
    await assertSucceeds(deleteDoc(doc(db, 'websiteOwners/bob@example.test')));
    await assertFails(deleteDoc(doc(db, 'websiteOwners/alice@example.test')));
    await assertFails(setDoc(doc(db, 'websiteOwners/alice@example.test'), { enabled: false }));
    await assertFails(setDoc(doc(db, 'websiteOwners/carol@example.test'), { enabled: false }));
    await assertFails(setDoc(doc(db, 'websiteOwners/carol@example.test'), { enabled: true, role: 'admin' }));
    await assertFails(setDoc(doc(db, 'websiteOwners/Carol@example.test'), { enabled: true }));
    await assertFails(setDoc(doc(db, 'websiteOwners/not-an-email'), { enabled: true }));
    await assertFails(deleteDoc(doc(db, 'website/content')));
  });

  test('revocation blocks subsequent writes, listings and restoration of access', async () => {
    const alice = authenticated('alice', 'alice@example.test');
    const bob = authenticated('bob', 'bob@example.test');
    await assertSucceeds(deleteDoc(doc(alice, 'websiteOwners/bob@example.test')));
    await assertSucceeds(getDoc(doc(bob, 'websiteOwners/bob@example.test')));
    await assertFails(getDocs(collection(bob, 'websiteOwners')));
    await assertFails(setDoc(doc(bob, 'website/content'), { payload: '{}', revision: 2, updatedAt: serverTimestamp(), updatedBy: 'bob' }));
    await assertFails(setDoc(doc(bob, 'websiteOwners/bob@example.test'), { enabled: true }));
  });

  test('content enforces exact fields, bounded payload, author, server timestamp and sequential revisions', async () => {
    const db = authenticated('alice', 'alice@example.test');
    const valid = { payload: '{}', revision: 2, updatedAt: serverTimestamp(), updatedBy: 'alice' };
    for (const invalid of [
      { ...valid, extra: true }, { ...valid, payload: 123 }, { ...valid, payload: 'a'.repeat(200_001) },
      { ...valid, revision: 0 }, { ...valid, revision: 1 }, { ...valid, revision: 3 }, { ...valid, revision: 2.5 },
      { ...valid, updatedBy: 'bob' }, { ...valid, updatedAt: Timestamp.fromMillis(0) },
      { payload: '{}', revision: 2, updatedBy: 'alice' },
    ]) await assertFails(setDoc(doc(db, 'website/content'), invalid));
    await assertSucceeds(setDoc(doc(db, 'website/content'), { ...valid, payload: 'a'.repeat(200_000) }));
  });

  test('content creation starts at revision 1 and simultaneous stale transactions cannot overwrite a winner', async () => {
    await environment.withSecurityRulesDisabled(async (context) => { await deleteDoc(doc(context.firestore(), 'website/content')); });
    const db = authenticated('alice', 'alice@example.test');
    const reference = doc(db, 'website/content');
    await assertFails(setDoc(reference, { payload: '{}', revision: 2, updatedAt: serverTimestamp(), updatedBy: 'alice' }));
    await assertSucceeds(setDoc(reference, { payload: '{}', revision: 1, updatedAt: serverTimestamp(), updatedBy: 'alice' }));
    const save = (payload: string): Promise<number> => runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (snapshot.data()?.['revision'] !== 1) throw new Error('Content changed. Reload before saving.');
      transaction.set(reference, { payload, revision: 2, updatedAt: serverTimestamp(), updatedBy: 'alice' });
      return 2;
    });
    const results = await Promise.allSettled([save('first'), save('second')]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
    assert.equal((await getDoc(reference)).data()?.['revision'], 2);
  });

  test('a batch cannot self-enroll and publish content together', async () => {
    const db = authenticated('outsider', 'outsider@example.test');
    const batch = writeBatch(db);
    batch.set(doc(db, 'websiteOwners/outsider@example.test'), { enabled: true });
    batch.set(doc(db, 'website/content'), { payload: '{}', revision: 2, updatedAt: serverTimestamp(), updatedBy: 'outsider' });
    await assertFails(batch.commit());
  });

  test('legacy project access is preserved without granting CMS or unrelated collection access', async () => {
    const publicDb = environment.unauthenticatedContext().firestore();
    await assertSucceeds(getDocs(collection(publicDb, 'projects')));
    await assertFails(setDoc(doc(publicDb, 'projects/example'), { title: 'Denied' }));
    for (const uid of ['0ePINre65yeCTJG7EcEA8oCweOT2', 'BgQIemYzEjhBvqTSS9HHQ20lrWR2']) {
      const legacyDb = authenticated(uid, 'legacy@example.test');
      await assertSucceeds(setDoc(doc(legacyDb, 'projects/example'), { title: 'Legacy project' }));
      await assertSucceeds(setDoc(doc(legacyDb, 'projects/example/details/metadata'), { version: 1 }));
      await assertFails(setDoc(doc(legacyDb, 'websiteOwners/legacy@example.test'), { enabled: true }));
      await assertFails(getDocs(collection(legacyDb, 'websiteOwners')));
      await assertFails(setDoc(doc(legacyDb, 'website/content'), { payload: '{}', revision: 2, updatedAt: serverTimestamp(), updatedBy: uid }));
      await assertFails(setDoc(doc(legacyDb, 'unrelated/document'), { enabled: true }));
    }
    await assertFails(setDoc(doc(authenticated('outsider', 'outsider@example.test'), 'projects/example'), { title: 'Denied' }));
  });
});
