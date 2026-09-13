import { useEffect, useState, type ReactElement } from 'react';

import type { Cms } from '../lib/cms';
import { buttonClass } from './editor-styles';
import { EditorField } from './editor/editor-field';

interface OwnerAccountsProps {
  cms: Cms;
  currentEmail: string;
}

interface OwnerAccountProps {
  owner: string;
  isCurrentAccount: boolean;
  busy: boolean;
  onRemove: () => void;
}

function OwnerAccount({
  owner,
  isCurrentAccount,
  busy,
  onRemove,
}: OwnerAccountProps): ReactElement {
  return (
    <li className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <span className="min-w-0 break-all text-base">{owner}</span>
      {isCurrentAccount ? (
        <span className="inline-flex min-h-12 items-center font-mono text-xs text-muted">
          Current account
        </span>
      ) : (
        <button
          type="button"
          aria-label={`Remove ${owner}`}
          className={buttonClass}
          disabled={busy}
          onClick={onRemove}
        >
          Remove
        </button>
      )}
    </li>
  );
}

/** Manage approved Google accounts without permitting self-removal. */
export function OwnerAccounts({ cms, currentEmail }: OwnerAccountsProps): ReactElement {
  const [owners, setOwners] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => {
    let active = true;
    void cms
      .listOwners()
      .then((value) => {
        if (active) setOwners(value);
      })
      .catch(() => {
        if (active) setStatus('Could not load approved accounts.');
      });
    return () => {
      active = false;
    };
  }, [cms]);
  const update = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setStatus('');
    try {
      await action();
      setOwners(await cms.listOwners());
      setEmail('');
      setStatus('Approved accounts updated.');
    } catch {
      setStatus(
        'Could not update accounts. Check the email and your owner access, then try again.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="mt-10 border-t border-ink pt-8 sm:pt-10"
      aria-labelledby="owner-accounts-title"
    >
      <h3 id="owner-accounts-title" className="text-3xl font-semibold tracking-tight">
        Approved Google accounts
      </h3>
      <p className="mt-3 mb-6 max-w-2xl text-base leading-relaxed text-muted">
        These people can publish content and manage other owners. Access changes take effect
        immediately, separately from your content draft. You cannot remove the account you are
        using.
      </p>
      <ul className="divide-y divide-rule border-y border-rule">
        {owners.map((owner) => (
          <OwnerAccount
            key={owner}
            owner={owner}
            isCurrentAccount={owner === currentEmail.toLowerCase()}
            busy={busy}
            onRemove={() => {
              void update(() => cms.removeOwner(owner));
            }}
          />
        ))}
      </ul>
      <form
        className="mt-7"
        onSubmit={(event) => {
          event.preventDefault();
          void update(() => cms.addOwner(email.trim().toLowerCase()));
        }}
      >
        <fieldset disabled={busy} className="min-w-0">
          <legend className="sr-only">Add an approved account</legend>
          <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <EditorField
              label="Google account email"
              type="email"
              value={email}
              onChange={setEmail}
            />
            <button className={buttonClass} disabled={busy} type="submit">
              Enable account
            </button>
          </div>
        </fieldset>
      </form>
      <p className="mt-4 text-base leading-relaxed text-ink" role="status">
        {busy ? 'Updating account access…' : status}
      </p>
    </section>
  );
}
