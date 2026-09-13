import {
  getIdTokenResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocsFromServer,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { z } from 'zod';

import { CmsError, safe } from './errors';
import type { Cms, CmsUser } from './types';

interface CmsAuthentication {
  operations: Pick<
    Cms,
    'subscribeAuth' | 'signIn' | 'signOut' | 'isOwner' | 'listOwners' | 'addOwner' | 'removeOwner'
  >;
  requireGoogle: () => Promise<CmsUser>;
}

const ownerDocument = z.object({ enabled: z.literal(true) }).strict();

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email)) {
    throw new CmsError('Enter a valid owner email address.');
  }
  return email;
}

/** Create account operations and the verified Google identity check used before writes. */
export function createAuthentication(auth: Auth, database: Firestore): CmsAuthentication {
  const owners = collection(database, 'websiteOwners');

  async function googleIdentity(): Promise<CmsUser | null> {
    const user = auth.currentUser;
    if (!user?.email || !user.emailVerified) return null;
    const token = await getIdTokenResult(user);
    if (token.signInProvider !== 'google.com') return null;
    return { uid: user.uid, email: normalizeEmail(user.email) };
  }

  async function requireGoogle(): Promise<CmsUser> {
    const user = await googleIdentity();
    if (!user) throw new CmsError('Sign in with your verified Google account to edit.');
    return user;
  }

  return {
    requireGoogle,
    operations: {
      subscribeAuth(callback): () => void {
        return onAuthStateChanged(
          auth,
          (user) => {
            callback(user?.email ? { uid: user.uid, email: user.email.toLowerCase() } : null);
          },
          () => callback(null),
        );
      },
      signIn(): Promise<void> {
        return safe('Google sign-in failed. Try signing in again.', async () => {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          await signInWithPopup(auth, provider);
        });
      },
      signOut(): Promise<void> {
        return safe('Sign-out failed. Try again.', () => firebaseSignOut(auth));
      },
      isOwner(): Promise<boolean> {
        return safe(
          'Unable to verify editor access. Check your connection and try again.',
          async () => {
            const user = await googleIdentity();
            if (!user) return false;
            const snapshot = await getDocFromServer(doc(owners, user.email));
            return snapshot.exists() && ownerDocument.safeParse(snapshot.data()).success;
          },
        );
      },
      listOwners(): Promise<string[]> {
        return safe('Unable to load owners. Check your access and connection.', async () => {
          await requireGoogle();
          const snapshot = await getDocsFromServer(owners);
          return snapshot.docs
            .filter((entry) => ownerDocument.safeParse(entry.data()).success)
            .map((entry) => entry.id)
            .sort();
        });
      },
      addOwner(email): Promise<void> {
        return safe('Unable to add this owner. Check your access and connection.', async () => {
          await requireGoogle();
          await setDoc(doc(owners, normalizeEmail(email)), { enabled: true });
        });
      },
      removeOwner(email): Promise<void> {
        return safe('Unable to remove this owner. Check your access and connection.', async () => {
          const user = await requireGoogle();
          const target = normalizeEmail(email);
          if (target === user.email) throw new CmsError('You cannot remove your own owner access.');
          await deleteDoc(doc(owners, target));
        });
      },
    },
  };
}
