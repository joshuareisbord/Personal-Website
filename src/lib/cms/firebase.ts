import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

/** Firebase services shared by the CMS operations. */
export interface FirebaseServices {
  auth: Auth;
  database: Firestore;
  storage: FirebaseStorage | null;
  emulators: boolean;
}

function isConfigured(value: string | undefined): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

/** Reuse the named app and connect newly created local apps to the emulators once. */
export function initializeFirebase(env: ImportMetaEnv, hostname: string): FirebaseServices | null {
  const apiKey = env['VITE_FIREBASE_API_KEY'];
  const authDomain = env['VITE_FIREBASE_AUTH_DOMAIN'];
  const projectId = env['VITE_FIREBASE_PROJECT_ID'];
  const appId = env['VITE_FIREBASE_APP_ID'];
  if (
    !isConfigured(apiKey) ||
    !isConfigured(authDomain) ||
    !isConfigured(projectId) ||
    !isConfigured(appId)
  ) {
    return null;
  }

  const emulators = env['VITE_USE_FIREBASE_EMULATORS'] === 'true';
  if (emulators && !['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
    throw new Error('CMS emulators require a localhost page.');
  }

  try {
    const existingApp = getApps().find((app) => app.name === 'website-cms');
    const storageBucket = env['VITE_FIREBASE_STORAGE_BUCKET'];
    const config: FirebaseOptions = { apiKey, authDomain, projectId, appId };
    if (storageBucket !== undefined) config.storageBucket = storageBucket;
    const app = existingApp ?? initializeApp(config, 'website-cms');
    const auth = getAuth(app);
    const database = getFirestore(app);
    const storage = isConfigured(storageBucket) ? getStorage(app) : null;

    if (emulators && !existingApp) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(database, '127.0.0.1', 8080);
      if (storage) connectStorageEmulator(storage, '127.0.0.1', 9199);
    }

    return { auth, database, storage, emulators };
  } catch {
    throw new Error('The editor could not initialize. Check the Firebase configuration.');
  }
}
