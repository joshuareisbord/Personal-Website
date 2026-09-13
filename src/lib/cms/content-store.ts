import {
  doc,
  getDocFromServer,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase/firestore';
import { z } from 'zod';

import { parseContent, serializeContent } from '../content';
import { CmsError, safe } from './errors';
import type { Cms, CmsUser, ContentSnapshot } from './types';

const storedContent = z
  .object({
    payload: z.string().max(200_000),
    revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    updatedAt: z.instanceof(Timestamp),
    updatedBy: z.string().min(1),
  })
  .strict();

function readContent(snapshot: DocumentSnapshot): ContentSnapshot | null {
  if (!snapshot.exists()) return null;
  const stored = storedContent.parse(snapshot.data());
  if (new TextEncoder().encode(stored.payload).byteLength > 200_000) {
    throw new Error('Content exceeds size limit.');
  }
  const raw: unknown = JSON.parse(stored.payload);
  return { content: parseContent(raw), revision: stored.revision };
}

/** Read validated published content and save it with an atomic revision check. */
export function createContentStore(
  database: Firestore,
  requireGoogle: () => Promise<CmsUser>,
): Pick<Cms, 'subscribeContent' | 'saveContent' | 'loadContent'> {
  const contentReference = doc(database, 'website/content');

  return {
    subscribeContent(onValue, onError): () => void {
      return onSnapshot(
        contentReference,
        (snapshot) => {
          if (snapshot.metadata.hasPendingWrites) return;
          let value: ContentSnapshot | null;
          try {
            value = readContent(snapshot);
          } catch {
            onError(new Error('Website content could not be read. Try again later.'));
            return;
          }
          onValue(value);
        },
        () => onError(new Error('Website content could not be loaded. Check your connection.')),
      );
    },
    saveContent(content, expectedRevision): Promise<number> {
      return safe(
        'Content could not be saved. Check your access and connection, then try again.',
        async () => {
          if (
            !Number.isSafeInteger(expectedRevision) ||
            expectedRevision < 0 ||
            expectedRevision >= Number.MAX_SAFE_INTEGER
          ) {
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
            if (currentRevision !== expectedRevision) {
              throw new CmsError(
                'Content changed in another session. Reload the editor before saving again.',
              );
            }
            const revision = currentRevision + 1;
            transaction.set(contentReference, {
              payload,
              revision,
              updatedAt: serverTimestamp(),
              updatedBy: user.uid,
            });
            return revision;
          });
        },
      );
    },
    loadContent(): Promise<ContentSnapshot | null> {
      return safe(
        'Unable to load the latest content. Check your connection and try again.',
        async () => {
          return readContent(await getDocFromServer(contentReference));
        },
      );
    },
  };
}
