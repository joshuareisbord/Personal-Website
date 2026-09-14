import type { ReactElement } from 'react';
import type { ContentDraft } from './use-content-draft';

interface EditorPublishBarProps {
  editor: Pick<
    ContentDraft,
    'saving' | 'dirty' | 'status' | 'failed' | 'preparingPhoto' | 'croppingPhoto' | 'photoFile'
  >;
}

function publicationStatus(editor: EditorPublishBarProps['editor']): string {
  if (editor.saving) return 'Publishing…';
  if (editor.dirty) return 'Unsaved changes';
  if (editor.status && !editor.failed) return 'Changes published';
  return 'No unpublished changes';
}

function publishButtonLabel(editor: EditorPublishBarProps['editor']): string {
  if (editor.saving) {
    return editor.photoFile ? 'Uploading and publishing…' : 'Publishing…';
  }
  if (editor.preparingPhoto) return 'Preparing photo…';
  if (editor.croppingPhoto) return 'Finish cropping first';
  return 'Save and publish';
}

/** Show publication state and block submission while a photo is being prepared or cropped. */
export function EditorPublishBar({ editor }: EditorPublishBarProps): ReactElement {
  const { saving, preparingPhoto, croppingPhoto } = editor;
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-4 border-t border-ink bg-paper py-5">
      <div className="min-w-0">
        <p className="font-mono text-xs text-ink" role="status">
          {publicationStatus(editor)}
        </p>
        <p className="mt-1 text-sm text-muted">
          {saving
            ? 'Keep this editor open while your changes are saved.'
            : 'Save to make this content visible on your website.'}
        </p>
      </div>
      <button
        type="submit"
        className="min-h-12 w-full border border-ink bg-ink px-6 py-3 font-mono text-xs text-paper hover:bg-night disabled:cursor-wait disabled:opacity-50 sm:w-auto"
        disabled={saving || preparingPhoto || croppingPhoto}
      >
        {publishButtonLabel(editor)}
      </button>
    </div>
  );
}
