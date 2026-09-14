import { useId, type ReactElement } from 'react';
import { controlClass } from '../editor-styles';

interface EditorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  required?: boolean;
  type?: string;
  hint?: string;
}

/** Label editable values, associate guidance, and retain native form validation. */
export function EditorField({
  label,
  value,
  onChange,
  multiline = false,
  required = true,
  type = 'text',
  hint,
}: EditorFieldProps): ReactElement {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-base font-medium text-ink">
          {label}
        </label>
        {!required && <span className="shrink-0 font-mono text-xs text-muted">Optional</span>}
      </div>
      {multiline ? (
        <textarea
          id={id}
          aria-describedby={hintId}
          className={`${controlClass} resize-y`}
          rows={5}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          aria-describedby={hintId}
          className={controlClass}
          type={type}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint && (
        <p id={hintId} className="mt-2 text-sm leading-relaxed text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
