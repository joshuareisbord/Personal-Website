import { useId, type ReactElement } from 'react';
import { EditorProfileSection } from './editor/editor-profile-section';
import { EditorExperienceSection } from './editor/editor-experience-section';
import { EditorContactSection } from './editor/editor-contact-section';
import { EditorPublishBar } from './editor/editor-publish-bar';
import { useContentDraft, type ContentEditorProps } from './editor/use-content-draft';

export { buttonClass, controlClass } from './editor-styles';
export { EditorField } from './editor/editor-field';

/** Edit a complete draft, publishing only after explicit validation and save. */
export function ContentEditor(props: ContentEditorProps): ReactElement {
  const sectionId = useId();
  const editor = useContentDraft(props);
  const { saving, status, failed, feedback, save } = editor;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <fieldset disabled={saving} className="min-w-0">
        <legend className="sr-only">Website content</legend>
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-muted">
          Make your changes below, then save and publish when you're ready. Your public website
          stays as it is until the save succeeds.
        </p>

        <EditorProfileSection sectionId={sectionId} editor={editor} />

        <EditorExperienceSection sectionId={sectionId} editor={editor} />

        <EditorContactSection sectionId={sectionId} editor={editor} />

        <EditorPublishBar editor={editor} />
      </fieldset>
      {status && (
        <p
          ref={feedback}
          role={failed ? 'alert' : 'status'}
          className="mt-4 scroll-mt-40 border border-rule p-4 text-base leading-relaxed text-ink"
        >
          {status}
        </p>
      )}
    </form>
  );
}
