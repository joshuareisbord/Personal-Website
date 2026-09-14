import { createAuthentication } from './cms/auth';
import { createContentStore } from './cms/content-store';
import { initializeFirebase } from './cms/firebase';
import { createPhotoStore } from './cms/photo-store';
import type { Cms } from './cms/types';

export type { Cms } from './cms/types';

let cachedCms: Cms | undefined;

/** Initialize Firebase on first browser use, returning null when configuration is missing. */
export function getCms(): Cms | null {
  if (typeof window === 'undefined') return null;
  if (cachedCms) return cachedCms;

  const services = initializeFirebase(import.meta.env, window.location.hostname);
  if (!services) return null;

  try {
    const { auth, database, storage, emulators } = services;
    const { operations, requireGoogle } = createAuthentication(auth, database);
    cachedCms = {
      ...operations,
      ...createContentStore(database, requireGoogle),
      ...createPhotoStore(storage, requireGoogle, emulators),
    };
    return cachedCms;
  } catch {
    throw new Error('The editor could not initialize. Check the Firebase configuration.');
  }
}
