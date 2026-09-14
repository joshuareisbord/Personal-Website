import type { ReactElement } from 'react';
import { EditorField } from './editor-field';
import type { ContentDraft } from './use-content-draft';
import { buttonClass } from '../editor-styles';
import type { WorkExperience } from '../../lib/profile';
import { EditorExperienceEntry } from './editor-experience-entry';

interface EditorExperienceSectionProps {
  sectionId: string;
  editor: Pick<
    ContentDraft,
    | 'draft'
    | 'changeDraft'
    | 'changeSiteText'
    | 'changeExperienceField'
    | 'changeExperienceLocation'
  >;
}

/** Render the experience fields without changing the editor form structure. */
export function EditorExperienceSection({
  sectionId,
  editor,
}: EditorExperienceSectionProps): ReactElement {
  const { draft, changeDraft, changeSiteText, changeExperienceField, changeExperienceLocation } =
    editor;
  const changeExperience = (experience: WorkExperience[]): void => {
    changeDraft({ ...draft, profile: { ...draft.profile, experience } });
  };
  const moveUp = (index: number, entry: WorkExperience): void => {
    const entries = [...draft.profile.experience];
    const previous = entries[index - 1];
    if (!previous) return;
    entries[index - 1] = entry;
    entries[index] = previous;
    changeExperience(entries);
  };
  const removePosition = (index: number): void => {
    changeExperience(draft.profile.experience.filter((_, position) => position !== index));
  };
  const addPosition = (): void => {
    changeExperience([
      ...draft.profile.experience,
      { company: '', title: '', startDate: '', endDate: null },
    ]);
  };
  return (
    <section
      aria-labelledby={`${sectionId}-experience`}
      className="border-t border-ink py-8 sm:py-10"
    >
      <h3 id={`${sectionId}-experience`} className="text-3xl font-semibold tracking-tight">
        Work experience
      </h3>
      <p className="mt-2 mb-7 text-base leading-relaxed text-muted">
        Choose the month and year for each role. Leave the end date blank for a current role.
        Positions appear in the order below; globe connections follow their start dates, from
        earliest to latest.
      </p>
      <EditorField
        label="Experience heading"
        value={draft.site.experienceTitle}
        onChange={(value) => changeSiteText('experienceTitle', value)}
      />
      <div className="mt-8 space-y-8">
        {draft.profile.experience.length === 0 && (
          <p className="border-y border-rule py-6 text-muted">
            No positions yet. Add a role to start your work history.
          </p>
        )}
        {draft.profile.experience.map((entry, index) => (
          <EditorExperienceEntry
            key={index}
            entry={entry}
            index={index}
            onChange={(key, value) => changeExperienceField(index, key, value)}
            onLocationChange={(location, place) => changeExperienceLocation(index, location, place)}
            onMoveUp={() => moveUp(index, entry)}
            onRemove={() => removePosition(index)}
          />
        ))}
      </div>
      <button
        type="button"
        className={`${buttonClass} mt-6`}
        disabled={draft.profile.experience.length >= 100}
        onClick={addPosition}
      >
        Add position
      </button>
    </section>
  );
}
