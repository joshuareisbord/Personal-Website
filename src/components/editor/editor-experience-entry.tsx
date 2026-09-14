import type { ReactElement } from 'react';
import type { WorkExperience, WorkPlace } from '../../lib/profile';
import { EditorField } from './editor-field';
import { buttonClass } from '../editor-styles';
import { LocationPicker } from '../location-picker';
import { MonthPicker } from '../month-picker';

interface EditorExperienceEntryProps {
  entry: WorkExperience;
  index: number;
  onChange: (key: Exclude<keyof WorkExperience, 'place'>, value: string) => void;
  onLocationChange: (location: string | undefined, place: WorkPlace | undefined) => void;
  onMoveUp: () => void;
  onRemove: () => void;
}

/** Edit one position while retaining date validation and location picker reset keys. */
export function EditorExperienceEntry({
  entry,
  index,
  onChange,
  onLocationChange,
  onMoveUp,
  onRemove,
}: EditorExperienceEntryProps): ReactElement {
  return (
    <fieldset className="min-w-0 space-y-5 border-t border-rule pt-5">
      <legend className="max-w-full pr-4 text-xl font-medium break-words">
        {entry.title || `Position ${index + 1}`}
        {entry.company && <span className="text-muted"> / {entry.company}</span>}
      </legend>
      <div className="grid gap-5 sm:grid-cols-2">
        <EditorField
          label="Company"
          value={entry.company}
          onChange={(value) => onChange('company', value)}
        />
        <EditorField
          label="Job title"
          value={entry.title}
          onChange={(value) => onChange('title', value)}
        />
        <MonthPicker
          label="Start date"
          value={entry.startDate}
          onChange={(value) => onChange('startDate', value)}
        />
        <MonthPicker
          label="End date"
          required={false}
          value={entry.endDate ?? ''}
          min={entry.startDate}
          onChange={(value) => onChange('endDate', value)}
        />
      </div>
      <LocationPicker
        key={JSON.stringify([entry.company, entry.title, entry.startDate])}
        location={entry.location}
        place={entry.place}
        onChange={(location, place) => onLocationChange(location, place)}
      />
      <EditorField
        label="Description"
        required={false}
        multiline
        value={entry.description ?? ''}
        onChange={(value) => onChange('description', value)}
      />
      <div className="flex flex-wrap gap-3">
        <button type="button" className={buttonClass} disabled={index === 0} onClick={onMoveUp}>
          Move up
        </button>
        <button type="button" className={buttonClass} onClick={onRemove}>
          Remove position {index + 1}
        </button>
      </div>
    </fieldset>
  );
}
