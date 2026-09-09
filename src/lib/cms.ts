import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, getIdTokenResult, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type Auth } from 'firebase/auth';
import { collection, connectFirestoreEmulator, deleteDoc, doc, getDocFromServer, getDocsFromServer, getFirestore, onSnapshot, runTransaction, serverTimestamp, setDoc, Timestamp, type DocumentSnapshot, type Firestore } from 'firebase/firestore';
import { z } from 'zod';

import { parseContent, serializeContent, type SiteContent } from './content';

interface ContentSnapshot {
  content: SiteContent;
  revision: number;
}

interface CmsUser {
  uid: string;
  email: string;
}

/** Public content subscriptions and authenticated owner editing operations. */
export interface Cms {
  subscribeContent(onValue: (snapshot: ContentSnapshot | null) => void, onError: (error: Error) => void): () => void;
  subscribeAuth(callback: (user: CmsUser | null) => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  isOwner(): Promise<boolean>;
  listOwners(): Promise<string[]>;
  addOwner(email: string): Promise<void>;
  removeOwner(email: string): Promise<void>;
  saveContent(content: SiteContent, expectedRevision: number): Promise<number>;
  loadContent(): Promise<ContentSnapshot | null>;
}

const storedContent = z.object({
  payload: z.string().max(200_000),
  revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  updatedAt: z.instanceof(Timestamp),
  updatedBy: z.string().min(1),
}).strict();
const ownerDocument = z.object({ enabled: z.literal(true) }).strict();

class CmsError extends Error {}

async function safe<T>(message: string, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw error instanceof CmsError ? error : new Error(message);
  }
}

function readContent(snapshot: DocumentSnapshot): ContentSnapshot | null {
  if (!snapshot.exists()) return null;
  const stored = storedContent.parse(snapshot.data());
  if (new TextEncoder().encode(stored.payload).byteLength > 200_000) throw new Error('Content exceeds size limit.');
  const raw: unknown = JSON.parse(stored.payload);
  return { content: parseContent(raw), revision: stored.revision };
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email)) throw new CmsError('Enter a valid owner email address.');
  return email;
}

function createCms(auth: Auth, database: Firestore): Cms {
  const contentReference = doc(database, 'website/content');
  const owners = collection(database, 'websiteOwners');

  const googleIdentity = async (): Promise<CmsUser | null> => {
    const user = auth.currentUser;
    if (!user?.email || !user.emailVerified) return null;
    const token = await getIdTokenResult(user);
    if (token.signInProvider !== 'google.com') return null;
    return { uid: user.uid, email: normalizeEmail(user.email) };
  };

  const requireGoogle = async (): Promise<CmsUser> => {
    const user = await googleIdentity();
    if (!user) throw new CmsError('Sign in with your verified Google account to edit.');
    return user;
  };

  return {
    subscribeContent(onValue, onError) {
      return onSnapshot(contentReference, (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;
        let value: ContentSnapshot | null;
        try {
          value = readContent(snapshot);
        } catch {
          onError(new Error('Website content could not be read. Try again later.'));
          return;
        }
        onValue(value);
      }, () => onError(new Error('Website content could not be loaded. Check your connection.')));
    },
    subscribeAuth(callback) {
      return onAuthStateChanged(auth, (user) => callback(user?.email ? { uid: user.uid, email: user.email.toLowerCase() } : null), () => callback(null));
    },
    signIn() {
      return safe('Google sign-in failed. Try signing in again.', async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
      });
    },
    signOut() {
      return safe('Sign-out failed. Try again.', () => firebaseSignOut(auth));
    },
    isOwner() {
      return safe('Unable to verify editor access. Check your connection and try again.', async () => {
        const user = await googleIdentity();
        if (!user) return false;
        const snapshot = await getDocFromServer(doc(owners, user.email));
        return snapshot.exists() && ownerDocument.safeParse(snapshot.data()).success;
      });
    },
    listOwners() {
      return safe('Unable to load owners. Check your access and connection.', async () => {
        await requireGoogle();
        const snapshot = await getDocsFromServer(owners);
        return snapshot.docs.filter((entry) => ownerDocument.safeParse(entry.data()).success).map((entry) => entry.id).sort();
      });
    },
    addOwner(email) {
      return safe('Unable to add this owner. Check your access and connection.', async () => {
        await requireGoogle();
        await setDoc(doc(owners, normalizeEmail(email)), { enabled: true });
      });
    },
    removeOwner(email) {
      return safe('Unable to remove this owner. Check your access and connection.', async () => {
        const user = await requireGoogle();
        const target = normalizeEmail(email);
        if (target === user.email) throw new CmsError('You cannot remove your own owner access.');
        await deleteDoc(doc(owners, target));
      });
    },
    saveContent(content, expectedRevision) {
      return safe('Content could not be saved. Check your access and connection, then try again.', async () => {
        if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision >= Number.MAX_SAFE_INTEGER) {
          throw new CmsError('The content revision is invalid. Reload the editor before saving.');
        }
        let payload: string;
        try {
          payload = serializeContent(content);
        } catch {
          throw new CmsError('Content is invalid or too large. Review the fields before saving.');
        }
        const user = await requireGoogle();
        return runTransaction(database, async (transaction) => {
          const snapshot = await transaction.get(contentReference);
          const currentRevision = readContent(snapshot)?.revision ?? 0;
          if (currentRevision !== expectedRevision) throw new CmsError('Content changed in another session. Reload the editor before saving again.');
          const revision = currentRevision + 1;
          transaction.set(contentReference, { payload, revision, updatedAt: serverTimestamp(), updatedBy: user.uid });
          return revision;
        });
      });
    },
    loadContent() {
      return safe('Unable to load the latest content. Check your connection and try again.', async () => readContent(await getDocFromServer(contentReference)));
    },
  };
}

let cachedCms: Cms | undefined;

/** Initialize Firebase on first browser use, returning null when configuration is missing. */
export function getCms(): Cms | null {
  if (typeof window === 'undefined') return null;
  if (cachedCms) return cachedCms;
  const env = import.meta.env;
  const config = {
    apiKey: env['VITE_FIREBASE_API_KEY'],
    authDomain: env['VITE_FIREBASE_AUTH_DOMAIN'],
    projectId: env['VITE_FIREBASE_PROJECT_ID'],
    appId: env['VITE_FIREBASE_APP_ID'],
  };
  if (Object.values(config).some((value) => typeof value !== 'string' || !value.trim())) return null;
  const emulators = env['VITE_USE_FIREBASE_EMULATORS'] === 'true';
  if (emulators && !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) {
    throw new Error('CMS emulators require a localhost page.');
  }
  try {
    const existingApp = getApps().find((app) => app.name === 'website-cms');
    const app = existingApp ?? initializeApp(config, 'website-cms');
    const auth = getAuth(app);
    const database = getFirestore(app);
    if (emulators && !existingApp) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(database, '127.0.0.1', 8080);
    }
    cachedCms = createCms(auth, database);
    return cachedCms;
  } catch {
    throw new Error('The editor could not initialize. Check the Firebase configuration.');
  }
}
