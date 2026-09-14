import type { ReactElement } from 'react';
import { EditorField } from './editor-field';
import type { ContentDraft } from './use-content-draft';
import { PhotoPicker } from '../photo-picker';

interface EditorProfileSectionProps {
  sectionId: string;
  editor: Pick<
    ContentDraft,
    | 'draft'
    | 'bio'
    | 'photoPath'
    | 'photoAlt'
    | 'photoFile'
    | 'photoCrop'
    | 'changeDraft'
    | 'changeSiteText'
    | 'changeBio'
    | 'changePhotoAlt'
    | 'changePhotoCrop'
    | 'changePhotoPath'
    | 'changePhotoFile'
    | 'setCroppingPhoto'
    | 'setPreparingPhoto'
  >;
}

/** Render the profile fields without changing the editor form structure. */
export function EditorProfileSection({
  sectionId,
  editor,
}: EditorProfileSectionProps): ReactElement {
  const {
    draft,
    bio,
    photoPath,
    photoAlt,
    photoFile,
    photoCrop,
    changeDraft,
    changeSiteText,
    changeBio,
    changePhotoAlt,
    changePhotoCrop,
    changePhotoPath,
    changePhotoFile,
    setCroppingPhoto,
    setPreparingPhoto,
  } = editor;
  return (
    <section aria-labelledby={`${sectionId}-profile`} className="border-t border-ink py-8 sm:py-10">
      <h3 id={`${sectionId}-profile`} className="text-3xl font-semibold tracking-tight">
        Profile &amp; bio
      </h3>
      <p className="mt-2 mb-7 text-base text-muted">
        Your introduction, background, and the photo in About.
      </p>
      <div className="space-y-6">
        <EditorField
          label="Name"
          value={draft.profile.name}
          onChange={(name) => changeDraft({ ...draft, profile: { ...draft.profile, name } })}
        />
        <EditorField
          label="Headline"
          value={draft.site.tagline}
          multiline
          onChange={(value) => changeSiteText('tagline', value)}
          hint="A short introduction beneath your name."
        />
        <EditorField
          label="About heading"
          value={draft.site.aboutTitle}
          onChange={(value) => changeSiteText('aboutTitle', value)}
        />
        <EditorField
          label="Bio"
          value={bio}
          multiline
          onChange={changeBio}
          hint="Separate paragraphs with a blank line."
        />
        <PhotoPicker
          path={photoPath}
          file={photoFile}
          alt={photoAlt}
          crop={photoCrop}
          onCropChange={changePhotoCrop}
          onCroppingChange={setCroppingPhoto}
          onPathChange={changePhotoPath}
          onFileChange={changePhotoFile}
          onPreparingChange={setPreparingPhoto}
        />
        <EditorField
          label="Photo description"
          value={photoAlt}
          required={Boolean(photoFile || photoPath.trim())}
          onChange={changePhotoAlt}
          hint="Describe the photo for someone using a screen reader."
        />
      </div>
    </section>
  );
}
