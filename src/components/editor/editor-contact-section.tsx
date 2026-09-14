import type { ReactElement } from 'react';
import { EditorField } from './editor-field';
import type { ContentDraft } from './use-content-draft';

interface EditorContactSectionProps {
  sectionId: string;
  editor: Pick<ContentDraft, 'draft' | 'changeSiteText' | 'changePhone'>;
}

/** Render the contact fields without changing the editor form structure. */
export function EditorContactSection({
  sectionId,
  editor,
}: EditorContactSectionProps): ReactElement {
  const { draft, changeSiteText, changePhone } = editor;
  return (
    <section aria-labelledby={`${sectionId}-contact`} className="border-t border-ink py-8 sm:py-10">
      <h3 id={`${sectionId}-contact`} className="text-3xl font-semibold tracking-tight">
        Contact &amp; social links
      </h3>
      <p className="mt-2 mb-7 text-base leading-relaxed text-muted">
        Choose how visitors can reach you. Email and phone are optional: leave either or both blank
        to hide them.
      </p>
      <div className="space-y-6">
        <EditorField
          label="Contact heading"
          value={draft.site.contactTitle}
          onChange={(value) => changeSiteText('contactTitle', value)}
        />
        <EditorField
          label="Contact introduction"
          value={draft.site.contactIntro}
          onChange={(value) => changeSiteText('contactIntro', value)}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <EditorField
            label="Contact email"
            type="email"
            required={false}
            value={draft.site.email}
            onChange={(value) => changeSiteText('email', value)}
            hint="Leave blank to hide your email address."
          />
          <EditorField
            label="Phone number"
            type="tel"
            required={false}
            value={draft.site.phone}
            onChange={changePhone}
            hint="Include the country code if needed, for example +1 (310) 555-0123. Leave blank to hide it."
          />
          <EditorField
            label="GitHub URL"
            type="url"
            value={draft.site.github}
            onChange={(value) => changeSiteText('github', value)}
          />
          <EditorField
            label="LinkedIn profile link"
            type="url"
            value={draft.site.linkedin}
            onChange={(value) => changeSiteText('linkedin', value)}
          />
        </div>
      </div>
    </section>
  );
}
