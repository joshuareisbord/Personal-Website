import { getDownloadURL, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';

import { validatePreparedPhoto } from '../photo-upload';
import { CmsError, safe } from './errors';
import type { Cms, CmsUser } from './types';

/** Upload immutable JPEG objects while preserving the published HTTPS URL contract. */
export function createPhotoStore(
  storage: FirebaseStorage | null,
  requireGoogle: () => Promise<CmsUser>,
  emulators: boolean,
): Pick<Cms, 'uploadPhoto'> {
  return {
    uploadPhoto(photo): Promise<string> {
      return safe(
        'Your photo could not be uploaded. Check your connection and owner access, then try saving again. Your current photo is unchanged.',
        async () => {
          if (!storage) {
            throw new CmsError(
              'Photo uploads are not configured. Set the Firebase Storage bucket before uploading. You can still use a photo link.',
            );
          }
          try {
            validatePreparedPhoto(photo);
          } catch {
            throw new CmsError('Choose a valid photo again before saving.');
          }
          const user = await requireGoogle();
          const target = ref(storage, `website-profile/${user.uid}/${crypto.randomUUID()}.jpg`);
          await uploadBytes(target, photo, {
            contentType: 'image/jpeg',
            cacheControl: 'public,max-age=31536000,immutable',
          });
          const url = new URL(await getDownloadURL(target));
          // Store the same HTTPS contract in demo content; rendering maps it locally.
          if (emulators) {
            url.protocol = 'https:';
            url.hostname = 'firebasestorage.googleapis.com';
            url.port = '';
          }
          return url.href;
        },
      );
    },
  };
}
