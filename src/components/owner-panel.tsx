import { useEffect, useRef, useState, type ReactElement } from 'react';

import { getCms } from '../lib/cms';
import { type SiteContent } from '../lib/content';
import { buttonClass, ContentEditor } from './content-editor';
import { OwnerAccounts } from './owner-accounts';
import { useOwnerSession } from './editor/use-owner-session';

interface OwnerPanelProps {
  fallback: SiteContent;
  onClose: () => void;
}

/** Authenticate before loading the owner editor; Firestore independently enforces access. */
export default function OwnerPanel({ fallback, onClose }: OwnerPanelProps): ReactElement {
  const [cms] = useState(() => {
    try {
      return getCms();
    } catch {
      return null;
    }
  });
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const {
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
  } = useOwnerSession({ cms, fallback, onClose });
  return (
    <dialog
      ref={dialog}
      aria-labelledby="owner-dialog-title"
      aria-describedby="owner-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto border border-ink bg-paper p-0 font-sans text-left text-ink backdrop:bg-ink/60 sm:w-[calc(100%-3rem)]"
    >
      <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-rule bg-paper px-5 py-5 sm:px-10 sm:py-6">
        <div className="min-w-0">
          <h2
            id="owner-dialog-title"
            className="text-3xl leading-none font-semibold tracking-tight sm:text-4xl"
          >
            Owner editor
          </h2>
          <p id="owner-dialog-description" className="mt-3 text-sm leading-relaxed text-muted">
            Your words, your work, your website.
          </p>
        </div>
        <button type="button" className={buttonClass} disabled={publishing} onClick={close}>
          Close
        </button>
      </div>
      <div className="px-5 py-6 sm:px-10 sm:py-8">
        {!cms ? (
          <p role="status" className="max-w-xl border border-rule p-5 leading-relaxed">
            Owner login is not configured yet. Complete the Firebase setup described in the project
            README.
          </p>
        ) : (
          <>
            {email ? (
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-6">
                <div className="min-w-0">
                  <p className="mb-1 font-mono text-xs text-muted">Signed in as</p>
                  <p className="break-all text-base">{email}</p>
                </div>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={busy || publishing}
                  onClick={() => {
                    void authenticate(true);
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="max-w-xl py-4">
                <p className="mb-6 text-lg leading-relaxed text-muted">
                  Sign in with an approved Google account to update your story, work experience, and
                  contact details.
                </p>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={busy || loading}
                  onClick={() => {
                    void authenticate(false);
                  }}
                >
                  {busy ? 'Opening Google…' : 'Sign in with Google'}
                </button>
              </div>
            )}
            {loading && (
              <p role="status" className="py-4 font-mono text-sm text-muted">
                Checking owner access…
              </p>
            )}
            {status && (
              <p role="status" className="my-5 border border-rule p-4 leading-relaxed">
                {status}
              </p>
            )}
            {draft && (
              <>
                <ContentEditor
                  key={draft.email}
                  initial={draft.content}
                  onDirty={setDirty}
                  onSave={publish}
                />
                <OwnerAccounts cms={cms} currentEmail={draft.email} />
              </>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
