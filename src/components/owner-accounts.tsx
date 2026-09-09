import { useEffect, useState, type ReactElement } from 'react';

import type { Cms } from '../lib/cms';
import { buttonClass, EditorField } from './content-editor';

/** Manage approved Google accounts without permitting self-removal. */
export function OwnerAccounts({ cms, currentEmail }: { cms: Cms; currentEmail: string }): ReactElement {
  const [owners, setOwners] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => {
    let active = true;
    void cms.listOwners().then((value) => { if (active) setOwners(value); }).catch(() => { if (active) setStatus('Could not load approved accounts.'); });
    return () => { active = false; };
  }, [cms]);
  const update = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true); setStatus('');
    try { await action(); setOwners(await cms.listOwners()); setEmail(''); setStatus('Approved accounts updated.'); }
    catch { setStatus('Could not update accounts. Check the email and your owner access, then try again.'); }
    finally { setBusy(false); }
  };
  return <section className="mt-10 border-t border-gray-600 pt-6" aria-labelledby="owner-accounts-title">
    <h3 id="owner-accounts-title" className="mb-3 text-xl font-semibold">Approved Google accounts</h3>
    <p className="mb-3 text-sm text-gray-400">Every approved account can publish content and manage other owners. You cannot remove the account you are using.</p>
    <ul className="space-y-2">{owners.map((owner) => <li key={owner} className="flex flex-wrap items-center justify-between gap-2">
      <span className="break-all">{owner}</span>
      {owner === currentEmail.toLowerCase() ? <span className="text-sm text-gray-400">Current account</span> : <button type="button" className={buttonClass} disabled={busy} onClick={() => { void update(() => cms.removeOwner(owner)); }}>Remove {owner}</button>}
    </li>)}</ul>
    <form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); void update(() => cms.addOwner(email.trim().toLowerCase())); }}>
      <EditorField label="Google account email" type="email" value={email} onChange={setEmail} />
      <button className={buttonClass} disabled={busy} type="submit">Enable account</button>
    </form>
    <p className="mt-3" role="status">{status}</p>
  </section>;
}
