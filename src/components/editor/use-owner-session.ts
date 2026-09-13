import { useEffect, useRef, useState } from 'react';
import type { Cms } from '../../lib/cms';
import { parseContent, type SiteContent } from '../../lib/content';

interface OwnerSessionOptions {
  cms: Cms | null;
  fallback: SiteContent;
  onClose: () => void;
}
interface AuthorizedDraft {
  email: string;
  content: SiteContent;
  revision: number;
}
interface UploadedPhoto {
  file: Blob;
  path: string;
}
interface OwnerSession {
  draft: AuthorizedDraft | null;
  email: string | null;
  status: string;
  loading: boolean;
  busy: boolean;
  publishing: boolean;
  setDirty: (value: boolean) => void;
  close: () => void;
  authenticate: (signingOut: boolean) => Promise<void>;
  publish: (content: SiteContent, photo?: Blob) => Promise<SiteContent>;
}

/** Coordinate owner access, unsaved-change prompts, and revision-aware publication. */
export function useOwnerSession({ cms, fallback, onClose }: OwnerSessionOptions): OwnerSession {
  const authGeneration = useRef(0);
  const uploadedPhoto = useRef<UploadedPhoto | null>(null);
  const [draft, setDraft] = useState<AuthorizedDraft | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(Boolean(cms));
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (!cms) return;
    const unsubscribe = cms.subscribeAuth((user) => {
      const current = ++authGeneration.current;
      uploadedPhoto.current = null;
      setDraft(null);
      setEmail(user?.email ?? null);
      setStatus('');
      setLoading(Boolean(user));
      setDirty(false);
      setPublishing(false);
      if (!user) return;
      void (async () => {
        try {
          if (!(await cms.isOwner())) {
            if (current === authGeneration.current)
              setStatus(
                'This Google account is not enabled. Sign out and choose an approved account.',
              );
            return;
          }
          const saved = await cms.loadContent();
          if (current === authGeneration.current)
            setDraft({
              email: user.email,
              content: saved?.content ?? fallback,
              revision: saved?.revision ?? 0,
            });
        } catch {
          if (current === authGeneration.current)
            setStatus(
              'Could not load the editor. Check your connection and owner access, then reopen it.',
            );
        } finally {
          if (current === authGeneration.current) setLoading(false);
        }
      })();
    });
    return () => {
      authGeneration.current++;
      unsubscribe();
    };
  }, [cms, fallback]);
  const close = (): void => {
    if (publishing) return;
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    onClose();
  };
  const authenticate = async (signingOut: boolean): Promise<void> => {
    if (!cms || publishing) return;
    if (signingOut && dirty && !window.confirm('Discard your unsaved changes and sign out?'))
      return;
    setBusy(true);
    setStatus('');
    try {
      if (signingOut) {
        await cms.signOut();
      } else {
        await cms.signIn();
      }
    } catch {
      setStatus(
        'Sign-in could not complete. Allow the Google popup, check your connection, and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const publish = async (content: SiteContent, photo?: Blob): Promise<SiteContent> => {
    if (!cms || !draft)
      throw new Error('Your sign-in changed. Reopen the editor before publishing.');

    const generation = authGeneration.current;
    setPublishing(true);
    try {
      if (photo) {
        const path =
          uploadedPhoto.current?.file === photo
            ? uploadedPhoto.current.path
            : await cms.uploadPhoto(photo);
        if (generation !== authGeneration.current)
          throw new Error('Your sign-in changed. Reopen the editor before publishing.');
        uploadedPhoto.current = { file: photo, path };
        content = parseContent({
          ...content,
          profile: { ...content.profile, photo: { ...content.profile.photo, path } },
        });
      }
      const revision = await cms.saveContent(content, draft.revision);
      if (generation === authGeneration.current) {
        setDraft({ ...draft, content, revision });
        uploadedPhoto.current = null;
      }
      return content;
    } finally {
      if (generation === authGeneration.current) setPublishing(false);
    }
  };
  return {
    draft,
    email,
    status,
    loading,
    busy,
    publishing,
    setDirty,
    close,
    authenticate,
    publish,
  };
}
