import { useEffect, useRef, useState, type ReactElement } from 'react';

import { getCms } from '../lib/cms';
import { parseContent, type SiteContent } from '../lib/content';
import { buttonClass, ContentEditor } from './content-editor';
import { OwnerAccounts } from './owner-accounts';

interface Props { fallback: SiteContent; onClose: () => void; }
interface AuthorizedDraft { email: string; content: SiteContent; revision: number; }

/** Authenticate before loading the owner editor; Firestore independently enforces access. */
export default function OwnerPanel({ fallback, onClose }: Props): ReactElement {
  const [cms] = useState(() => { try { return getCms(); } catch { return null; } });
  const dialog = useRef<HTMLDialogElement>(null);
  const authGeneration = useRef(0);
  const uploadedPhoto = useRef<{ file: Blob; path: string } | null>(null);
  const [draft, setDraft] = useState<AuthorizedDraft | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(Boolean(cms));
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent): void => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (!cms) return;
    const unsubscribe = cms.subscribeAuth((user) => {
      const current = ++authGeneration.current;
      uploadedPhoto.current = null;
      setDraft(null); setEmail(user?.email ?? null); setStatus(''); setLoading(Boolean(user)); setDirty(false); setPublishing(false);
      if (!user) return;
      void (async () => {
        try {
          if (!await cms.isOwner()) {
            if (current === authGeneration.current) setStatus('This Google account is not enabled. Sign out and choose an approved account.');
            return;
          }
          const saved = await cms.loadContent();
          if (current === authGeneration.current) setDraft({ email: user.email, content: saved?.content ?? fallback, revision: saved?.revision ?? 0 });
        } catch { if (current === authGeneration.current) setStatus('Could not load the editor. Check your connection and owner access, then reopen it.'); }
        finally { if (current === authGeneration.current) setLoading(false); }
      })();
    });
    return () => { authGeneration.current++; unsubscribe(); };
  }, [cms, fallback]);
  const close = (): void => { if (!publishing && (!dirty || window.confirm('Discard your unsaved changes?'))) onClose(); };
  const authenticate = async (signingOut: boolean): Promise<void> => {
    if (!cms || publishing || signingOut && dirty && !window.confirm('Discard your unsaved changes and sign out?')) return;
    setBusy(true); setStatus('');
    try { if (signingOut) await cms.signOut(); else await cms.signIn(); }
    catch { setStatus('Sign-in could not complete. Allow the Google popup, check your connection, and try again.'); }
    finally { setBusy(false); }
  };
  return <dialog ref={dialog} aria-labelledby="owner-dialog-title" aria-describedby="owner-dialog-description" onCancel={(event) => { event.preventDefault(); close(); }} className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto border border-ink bg-paper p-0 font-sans text-left text-ink backdrop:bg-ink/60 sm:w-[calc(100%-3rem)]">
    <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-rule bg-paper px-5 py-5 sm:px-10 sm:py-6">
      <div className="min-w-0">
        <h2 id="owner-dialog-title" className="text-3xl leading-none font-semibold tracking-tight sm:text-4xl">Owner editor</h2>
        <p id="owner-dialog-description" className="mt-3 text-sm leading-relaxed text-muted">Your words, your work, your website.</p>
      </div>
      <button type="button" className={buttonClass} disabled={publishing} onClick={close}>Close</button>
    </div>
    <div className="px-5 py-6 sm:px-10 sm:py-8">
    {!cms ? <p role="status" className="max-w-xl border border-rule p-5 leading-relaxed">Owner login is not configured yet. Complete the Firebase setup described in the project README.</p> : <>
      {email ? <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-6">
        <div className="min-w-0"><p className="mb-1 font-mono text-xs text-muted">Signed in as</p><p className="break-all text-base">{email}</p></div>
        <button type="button" className={buttonClass} disabled={busy || publishing} onClick={() => { void authenticate(true); }}>Sign out</button>
      </div>
        : <div className="max-w-xl py-4"><p className="mb-6 text-lg leading-relaxed text-muted">Sign in with an approved Google account to update your story, work experience, and contact details.</p><button type="button" className={buttonClass} disabled={busy || loading} onClick={() => { void authenticate(false); }}>{busy ? 'Opening Google…' : 'Sign in with Google'}</button></div>}
      {loading && <p role="status" className="py-4 font-mono text-sm text-muted">Checking owner access…</p>}
      {status && <p role="status" className="my-5 border border-rule p-4 leading-relaxed">{status}</p>}
      {draft && <>
        <ContentEditor key={draft.email} initial={draft.content} onDirty={setDirty} onSave={async (content, photo) => {
          const generation = authGeneration.current;
          setPublishing(true);
          try {
            if (photo) {
              const path = uploadedPhoto.current?.file === photo ? uploadedPhoto.current.path : await cms.uploadPhoto(photo);
              if (generation !== authGeneration.current) throw new Error('Your sign-in changed. Reopen the editor before publishing.');
              uploadedPhoto.current = { file: photo, path };
              content = parseContent({ ...content, profile: { ...content.profile, photo: { ...content.profile.photo, path } } });
            }
            const revision = await cms.saveContent(content, draft.revision);
            if (generation === authGeneration.current) { setDraft({ ...draft, content, revision }); uploadedPhoto.current = null; }
            return content;
          } finally { if (generation === authGeneration.current) setPublishing(false); }
        }} />
        <OwnerAccounts cms={cms} currentEmail={draft.email} />
      </>}
    </>}
    </div>
  </dialog>;
}
