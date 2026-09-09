import { useEffect, useId, useRef, useState, type ReactElement } from 'react';

import { parseContent, type SiteContent, type SiteCopy } from '../lib/content';
import type { Profile, WorkPlace } from '../lib/profile';
import { buttonClass, controlClass } from './editor-styles';
import { LocationPicker } from './location-picker';
import { MonthPicker } from './month-picker';
import { PhotoPicker } from './photo-picker';

export { buttonClass, controlClass } from './editor-styles';

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  required?: boolean;
  type?: string;
  hint?: string;
}

/** Label editable values, associate guidance, and retain native form validation. */
export function EditorField({ label, value, onChange, multiline = false, required = true, type = 'text', hint }: FieldProps): ReactElement {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return <div className="min-w-0">
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={id} className="text-base font-medium text-ink">{label}</label>
      {!required && <span className="shrink-0 font-mono text-xs text-muted">Optional</span>}
    </div>
    {multiline ? <textarea id={id} aria-describedby={hintId} className={`${controlClass} resize-y`} rows={5} required={required} value={value} onChange={(event) => onChange(event.target.value)} />
      : <input id={id} aria-describedby={hintId} className={controlClass} type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} />}
    {hint && <p id={hintId} className="mt-2 text-sm leading-relaxed text-muted">{hint}</p>}
  </div>;
}

interface Props { initial: SiteContent; onSave: (content: SiteContent, photo?: Blob) => Promise<SiteContent | void>; onDirty: (dirty: boolean) => void; }

/** Edit a complete draft, publishing only after explicit validation and save. */
export function ContentEditor({ initial, onSave, onDirty }: Props): ReactElement {
  const sectionId = useId();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [draft, setDraft] = useState(initial);
  const [bio, setBio] = useState(initial.site.about.join('\n\n'));
  const [photoPath, setPhotoPath] = useState(initial.profile.photo?.path ?? '');
  const [photoAlt, setPhotoAlt] = useState(initial.profile.photo?.alt ?? '');
  const [photoFile, setPhotoFile] = useState<Blob | null>(null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (failed) feedback.current?.scrollIntoView({ block: 'nearest' });
  }, [failed, status]);
  const change = (next: SiteContent): void => {
    setDraft(next); setDirty(true); onDirty(true); setStatus(''); setFailed(false);
  };
  const copy = (key: keyof SiteCopy, value: string): void => change({ ...draft, site: { ...draft.site, [key]: value } });
  const phone = (value: string): void => {
    const digits = value.trim().replace(/[\s().-]/g, '');
    const phoneHref = /^\+?\d{3,30}$/.test(digits) ? `tel:${digits}` : '';
    change({ ...draft, site: { ...draft.site, phone: value.trim() ? value : '', phoneHref } });
  };
  const role = (index: number, key: Exclude<keyof Profile['experience'][number], 'place'>, value: string): void => {
    const experience = draft.profile.experience.map((entry, position) => {
      if (position !== index) return entry;
      const updated = { ...entry, [key]: value };
      if (key === 'endDate' && !value) updated.endDate = null;
      if ((key === 'description' || key === 'location') && !value) delete updated[key];
      return updated;
    });
    change({ ...draft, profile: { ...draft.profile, experience } });
  };
  const locate = (index: number, location: string | undefined, place: WorkPlace | undefined): void => {
    const experience = draft.profile.experience.map((entry, position) => {
      if (position !== index) return entry;
      const updated = { ...entry };
      if (location) updated.location = location; else delete updated.location;
      if (place) updated.place = place; else delete updated.place;
      return updated;
    });
    change({ ...draft, profile: { ...draft.profile, experience } });
  };
  const save = async (): Promise<void> => {
    if (preparingPhoto || saving) return;
    setSaving(true); setStatus(''); setFailed(false);
    try {
      if (draft.site.phone.trim() && !draft.site.phoneHref) {
        throw new Error('Enter a phone number using digits, an optional + country code, spaces, parentheses, periods, or dashes. You can also leave it blank.');
      }
      let content: SiteContent;
      try {
        content = parseContent({ ...draft,
          profile: { ...draft.profile, photo: photoFile || photoPath.trim() ? { path: photoFile ? '/profile/pending.jpg' : photoPath.trim(), alt: photoAlt.trim() } : null },
          site: { ...draft.site, about: bio.split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean) },
        });
      } catch { throw new Error('Check required text, photo description, links, contact details, and work dates. An end date must follow its start date.'); }
      const published = await onSave(content, photoFile ?? undefined) ?? content;
      if (!mounted.current) return;
      setDraft(published); setPhotoPath(published.profile.photo?.path ?? ''); setPhotoFile(null);
      setDirty(false); onDirty(false); setStatus('Published. Your website is updated.');
    } catch (error) {
      if (mounted.current) { setFailed(true); setStatus(error instanceof Error ? error.message : 'Could not publish. Your draft is still here.'); }
    } finally { if (mounted.current) setSaving(false); }
  };
  return <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <fieldset disabled={saving} className="min-w-0">
      <legend className="sr-only">Website content</legend>
      <p className="mb-8 max-w-2xl text-base leading-relaxed text-muted">Make your changes below, then save and publish when you're ready. Your public website stays as it is until the save succeeds.</p>

      <section aria-labelledby={`${sectionId}-profile`} className="border-t border-ink py-8 sm:py-10">
        <h3 id={`${sectionId}-profile`} className="text-3xl font-semibold tracking-tight">Profile &amp; bio</h3>
        <p className="mt-2 mb-7 text-base text-muted">Your introduction, background, and the photo in About.</p>
        <div className="space-y-6">
          <EditorField label="Name" value={draft.profile.name} onChange={(name) => change({ ...draft, profile: { ...draft.profile, name } })} />
          <EditorField label="Headline" value={draft.site.tagline} multiline onChange={(value) => copy('tagline', value)} hint="A short introduction beneath your name." />
          <EditorField label="About heading" value={draft.site.aboutTitle} onChange={(value) => copy('aboutTitle', value)} />
          <EditorField label="Bio" value={bio} multiline onChange={(value) => { setBio(value); change(draft); }} hint="Separate paragraphs with a blank line." />
          <PhotoPicker path={photoPath} file={photoFile} alt={photoAlt}
            onPathChange={(value) => { setPhotoPath(value); change(draft); }}
            onFileChange={(value) => { setPhotoFile(value); change(draft); }} onPreparingChange={setPreparingPhoto} />
          <EditorField label="Photo description" value={photoAlt} required={Boolean(photoFile || photoPath.trim())} onChange={(value) => { setPhotoAlt(value); change(draft); }} hint="Describe the photo for someone using a screen reader." />
        </div>
      </section>

      <section aria-labelledby={`${sectionId}-experience`} className="border-t border-ink py-8 sm:py-10">
        <h3 id={`${sectionId}-experience`} className="text-3xl font-semibold tracking-tight">Work experience</h3>
        <p className="mt-2 mb-7 text-base leading-relaxed text-muted">Choose the month and year for each role. Leave the end date blank for a current role. Positions appear in the order below; globe connections follow their start dates, from earliest to latest.</p>
        <EditorField label="Experience heading" value={draft.site.experienceTitle} onChange={(value) => copy('experienceTitle', value)} />
        <div className="mt-8 space-y-8">
          {draft.profile.experience.length === 0 && <p className="border-y border-rule py-6 text-muted">No positions yet. Add a role to start your work history.</p>}
          {draft.profile.experience.map((entry, index) => <fieldset key={index} className="min-w-0 space-y-5 border-t border-rule pt-5">
            <legend className="max-w-full pr-4 text-xl font-medium break-words">{entry.title || `Position ${index + 1}`}{entry.company && <span className="text-muted"> / {entry.company}</span>}</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <EditorField label="Company" value={entry.company} onChange={(value) => role(index, 'company', value)} />
              <EditorField label="Job title" value={entry.title} onChange={(value) => role(index, 'title', value)} />
              <MonthPicker label="Start date" value={entry.startDate} onChange={(value) => role(index, 'startDate', value)} />
              <MonthPicker label="End date" required={false} value={entry.endDate ?? ''} min={entry.startDate} onChange={(value) => role(index, 'endDate', value)} />
            </div>
            <LocationPicker key={JSON.stringify([entry.company, entry.title, entry.startDate])} location={entry.location} place={entry.place} onChange={(location, place) => locate(index, location, place)} />
            <EditorField label="Description" required={false} multiline value={entry.description ?? ''} onChange={(value) => role(index, 'description', value)} />
            <div className="flex flex-wrap gap-3">
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
        </div>
        <button type="button" className={`${buttonClass} mt-6`} disabled={draft.profile.experience.length >= 100} onClick={() => change({ ...draft, profile: { ...draft.profile, experience: [...draft.profile.experience, { company: '', title: '', startDate: '', endDate: null }] } })}>Add position</button>
      </section>

      <section aria-labelledby={`${sectionId}-contact`} className="border-t border-ink py-8 sm:py-10">
        <h3 id={`${sectionId}-contact`} className="text-3xl font-semibold tracking-tight">Contact &amp; social links</h3>
        <p className="mt-2 mb-7 text-base leading-relaxed text-muted">Choose how visitors can reach you. Email and phone are optional: leave either or both blank to hide them.</p>
        <div className="space-y-6">
          <EditorField label="Contact heading" value={draft.site.contactTitle} onChange={(value) => copy('contactTitle', value)} />
          <EditorField label="Contact introduction" value={draft.site.contactIntro} onChange={(value) => copy('contactIntro', value)} />
          <div className="grid gap-6 sm:grid-cols-2">
            <EditorField label="Contact email" type="email" required={false} value={draft.site.email} onChange={(value) => copy('email', value)} hint="Leave blank to hide your email address." />
            <EditorField label="Phone number" type="tel" required={false} value={draft.site.phone} onChange={phone} hint="Include the country code if needed, for example +1 (310) 555-0123. Leave blank to hide it." />
            <EditorField label="GitHub URL" type="url" value={draft.site.github} onChange={(value) => copy('github', value)} />
            <EditorField label="LinkedIn profile link" type="url" value={draft.site.linkedin} onChange={(value) => copy('linkedin', value)} />
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-4 border-t border-ink bg-paper py-5">
        <div className="min-w-0">
          <p className="font-mono text-xs text-ink" role="status">{saving ? 'Publishing…' : dirty ? 'Unsaved changes' : status && !failed ? 'Changes published' : 'No unpublished changes'}</p>
          <p className="mt-1 text-sm text-muted">{saving ? 'Keep this editor open while your changes are saved.' : 'Save to make this content visible on your website.'}</p>
        </div>
        <button type="submit" className="min-h-12 w-full border border-ink bg-ink px-6 py-3 font-mono text-xs text-paper hover:bg-night disabled:cursor-wait disabled:opacity-50 sm:w-auto" disabled={saving || preparingPhoto}>{saving ? photoFile ? 'Uploading and publishing…' : 'Publishing…' : preparingPhoto ? 'Preparing photo…' : 'Save and publish'}</button>
      </div>
    </fieldset>
    {status && <p ref={feedback} role={failed ? 'alert' : 'status'} className="mt-4 scroll-mt-40 border border-rule p-4 text-base leading-relaxed text-ink">{status}</p>}
  </form>;
}
