import { useEffect, useId, useRef, useState, type ReactElement } from 'react';

import { parseContent, type SiteContent, type SiteCopy } from '../lib/content';
import type { Profile } from '../lib/profile';

export const controlClass = 'mt-1 min-h-11 w-full border border-gray-600 bg-gray-900 px-3 py-2 text-base text-gray-50 focus-visible:outline-2 focus-visible:outline-chalk';
export const buttonClass = 'min-h-11 border border-gray-600 px-4 py-2 text-gray-50 hover:border-chalk disabled:opacity-50';

interface FieldProps { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; required?: boolean; type?: string; }

/** Label every owner-editable value and use native form validation. */
export function EditorField({ label, value, onChange, multiline = false, required = true, type = 'text' }: FieldProps): ReactElement {
  const id = useId();
  return <div className="text-sm text-gray-50"><label htmlFor={id} className="block">{label}</label>
    {multiline ? <textarea id={id} className={controlClass} rows={5} required={required} value={value} onChange={(event) => onChange(event.target.value)} />
      : <input id={id} className={controlClass} type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} />}
  </div>;
}

interface Props { initial: SiteContent; onSave: (content: SiteContent) => Promise<void>; onDirty: (dirty: boolean) => void; }

/** Edit a complete draft, publishing only after explicit validation and save. */
export function ContentEditor({ initial, onSave, onDirty }: Props): ReactElement {
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [draft, setDraft] = useState(initial);
  const [bio, setBio] = useState(initial.site.about.join('\n\n'));
  const [photoPath, setPhotoPath] = useState(initial.profile.photo?.path ?? '');
  const [photoAlt, setPhotoAlt] = useState(initial.profile.photo?.alt ?? '');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const change = (next: SiteContent): void => { setDraft(next); setDirty(true); onDirty(true); setStatus(''); };
  const copy = (key: keyof SiteCopy, value: string): void => change({ ...draft, site: { ...draft.site, [key]: value } });
  const role = (index: number, key: keyof Profile['experience'][number], value: string): void => {
    const experience = draft.profile.experience.map((entry, position) => {
      if (position !== index) return entry;
      const updated = { ...entry, [key]: value };
      if (key === 'endDate' && !value) updated.endDate = null;
      if ((key === 'description' || key === 'location') && !value) delete updated[key];
      return updated;
    });
    change({ ...draft, profile: { ...draft.profile, experience } });
  };
  const save = async (): Promise<void> => {
    setSaving(true); setStatus('');
    try {
      let content: SiteContent;
      try {
        content = parseContent({ ...draft,
          profile: { ...draft.profile, photo: photoPath.trim() ? { path: photoPath.trim(), alt: photoAlt.trim() } : null },
          site: { ...draft.site, about: bio.split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean) },
        });
      } catch { throw new Error('Check required text, photo description, HTTPS links, and experience dates (YYYY or YYYY-MM; end must follow start).'); }
      await onSave(content);
      if (!mounted.current) return;
      setDraft(content); setDirty(false); onDirty(false); setStatus('Published. Your website is updated.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not publish. Your draft is still here.'); }
    finally { setSaving(false); }
  };
  return <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <fieldset disabled={saving} className="space-y-5">
      <legend className="mb-4 text-xl font-semibold">Website content</legend>
      <EditorField label="Name" value={draft.profile.name} onChange={(name) => change({ ...draft, profile: { ...draft.profile, name } })} />
      <EditorField label="Headline" value={draft.site.tagline} multiline onChange={(value) => copy('tagline', value)} />
      <EditorField label="About heading" value={draft.site.aboutTitle} onChange={(value) => copy('aboutTitle', value)} />
      <EditorField label="Bio (separate paragraphs with a blank line)" value={bio} multiline onChange={(value) => { setBio(value); change(draft); }} />
      <EditorField label="Photo URL (optional HTTPS link or /profile/ file)" value={photoPath} required={false} onChange={(value) => { setPhotoPath(value); change(draft); }} />
      <EditorField label="Photo description" value={photoAlt} required={Boolean(photoPath.trim())} onChange={(value) => { setPhotoAlt(value); change(draft); }} />
      <EditorField label="Experience heading" value={draft.site.experienceTitle} onChange={(value) => copy('experienceTitle', value)} />
      <section className="space-y-5" aria-label="Edit work experience">
        <h3 className="text-xl font-semibold">Work experience</h3>
        <p className="text-sm text-gray-400">Dates use YYYY or YYYY-MM. Leave the end date blank for a current position. Positions appear in the order below.</p>
        {draft.profile.experience.map((entry, index) => <fieldset key={index} className="space-y-3 border border-gray-600 p-4">
          <legend className="px-2">Position {index + 1}</legend>
          <EditorField label="Company" value={entry.company} onChange={(value) => role(index, 'company', value)} />
          <EditorField label="Job title" value={entry.title} onChange={(value) => role(index, 'title', value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <EditorField label="Start date" value={entry.startDate} onChange={(value) => role(index, 'startDate', value)} />
            <EditorField label="End date (blank = current)" required={false} value={entry.endDate ?? ''} onChange={(value) => role(index, 'endDate', value)} />
          </div>
          <EditorField label="Location (optional)" required={false} value={entry.location ?? ''} onChange={(value) => role(index, 'location', value)} />
          <EditorField label="Description (optional)" required={false} multiline value={entry.description ?? ''} onChange={(value) => role(index, 'description', value)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass} disabled={index === 0} onClick={() => {
              const entries = [...draft.profile.experience];
              const previous = entries[index - 1];
              if (!previous) return;
              entries[index - 1] = entry; entries[index] = previous;
              change({ ...draft, profile: { ...draft.profile, experience: entries } });
            }}>Move up</button>
            <button type="button" className={buttonClass} onClick={() => change({ ...draft, profile: { ...draft.profile, experience: draft.profile.experience.filter((_, position) => position !== index) } })}>Remove position {index + 1}</button>
          </div>
        </fieldset>)}
        <button type="button" className={buttonClass} disabled={draft.profile.experience.length >= 100} onClick={() => change({ ...draft, profile: { ...draft.profile, experience: [...draft.profile.experience, { company: '', title: '', startDate: '', endDate: null }] } })}>Add position</button>
      </section>
      <EditorField label="Contact heading" value={draft.site.contactTitle} onChange={(value) => copy('contactTitle', value)} />
      <EditorField label="Contact introduction" value={draft.site.contactIntro} onChange={(value) => copy('contactIntro', value)} />
      <EditorField label="Contact email" type="email" value={draft.site.email} onChange={(value) => copy('email', value)} />
      <EditorField label="Phone display text" value={draft.site.phone} onChange={(value) => copy('phone', value)} />
      <EditorField label="Phone link (tel:+13103511198)" value={draft.site.phoneHref} onChange={(value) => copy('phoneHref', value)} />
      <EditorField label="GitHub URL" type="url" value={draft.site.github} onChange={(value) => copy('github', value)} />
      <EditorField label="LinkedIn profile link" type="url" value={draft.site.linkedin} onChange={(value) => copy('linkedin', value)} />
      <button type="submit" className="min-h-11 border border-chalk bg-chalk px-4 py-2 font-semibold text-night hover:bg-white disabled:opacity-50" disabled={saving}>{saving ? 'Publishing…' : 'Save and publish'}</button>
      {dirty && <span className="ml-3 text-sm text-gray-400">Unsaved changes</span>}
    </fieldset>
    <p role="status" className="text-gray-50">{status}</p>
  </form>;
}
