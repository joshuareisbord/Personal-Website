import { useEffect, useRef, useState, type ReactElement } from 'react';

import { getCms } from '../lib/cms';
import type { SiteContent } from '../lib/content';
import { buttonClass, ContentEditor } from './content-editor';
import { OwnerAccounts } from './owner-accounts';

interface Props { fallback: SiteContent; onClose: () => void; }
interface AuthorizedDraft { email: string; content: SiteContent; revision: number; }

/** Authenticate before loading the owner editor; Firestore independently enforces access. */
export default function OwnerPanel({ fallback, onClose }: Props): ReactElement {
  const [cms] = useState(() => { try { return getCms(); } catch { return null; } });
  const dialog = useRef<HTMLDialogElement>(null);
  const authGeneration = useRef(0);
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
  return <dialog ref={dialog} aria-labelledby="owner-dialog-title" onCancel={(event) => { event.preventDefault(); close(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto border border-gray-600 bg-gray-800 p-5 text-left text-gray-50 backdrop:bg-black/70 sm:p-8">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 id="owner-dialog-title" className="text-2xl font-semibold">Owner editor</h2>
      <button type="button" className={buttonClass} disabled={publishing} onClick={close}>Close</button>
    </div>
    {!cms ? <p role="status">Owner login is not configured yet. Complete the Firebase setup described in the project README.</p> : <>
      {email ? <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><p className="break-all">Signed in as {email}</p><button type="button" className={buttonClass} disabled={busy || publishing} onClick={() => { void authenticate(true); }}>Sign out</button></div>
        : <><p className="mb-4 text-gray-400">Sign in with an approved Google account to edit your website.</p><button type="button" className={buttonClass} disabled={busy || loading} onClick={() => { void authenticate(false); }}>Sign in with Google</button></>}
      {loading && <p role="status">Checking owner access…</p>}
      <p role="status" className="my-4">{status}</p>
      {draft && <>
        <ContentEditor key={draft.email} initial={draft.content} onDirty={setDirty} onSave={async (content) => {
          const generation = authGeneration.current;
          setPublishing(true);
          try {
            const revision = await cms.saveContent(content, draft.revision);
            if (generation === authGeneration.current) setDraft({ ...draft, content, revision });
          } finally { if (generation === authGeneration.current) setPublishing(false); }
        }} />
        <OwnerAccounts cms={cms} currentEmail={draft.email} />
      </>}
    </>}
  </dialog>;
}
