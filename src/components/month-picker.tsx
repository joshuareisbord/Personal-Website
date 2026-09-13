import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';

import { EXPERIENCE_MONTHS, formatExperienceDate, isExperienceDate } from '../lib/dates';

import { buttonClass, controlClass } from './editor-styles';

/** Controlled profile date; an empty optional value represents a current role. */
export interface MonthPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  min?: string;
}

function precedesMinimum(value: string, min: string): boolean {
  if (!isExperienceDate(value) || !isExperienceDate(min)) return false;
  // Unknown end months can overlap a known start month, as in the profile schema.
  return (value.length === 4 ? `${value}-12` : value) < (min.length === 4 ? `${min}-01` : min);
}

function dateValidationMessage({
  value,
  label,
  required = true,
  min = '',
}: Pick<MonthPickerProps, 'value' | 'label' | 'required' | 'min'>): string {
  if (!value) {
    return required ? `Choose a month and year for ${label.toLowerCase()}.` : '';
  }
  if (!isExperienceDate(value)) return 'Choose a valid month and year.';
  if (precedesMinimum(value, min)) return `Choose ${formatExperienceDate(min)} or later.`;
  return '';
}

function dateHint(value: string, required: boolean): string {
  if (isExperienceDate(value) && value.length === 4) {
    return 'Month unknown. Your year stays unchanged until you choose a month.';
  }
  return required
    ? 'Choose the month and year.'
    : 'Choose a month and year, or leave as Present for a current role.';
}

function initialPickerYear(value: string, min: string): string {
  if (isExperienceDate(value)) return value.slice(0, 4);
  const minimumYear = isExperienceDate(min) ? Number(min.slice(0, 4)) : 1000;
  return String(Math.max(new Date().getFullYear(), minimumYear));
}

/** Choose an explicit month while preserving legacy years and native form validation. */
export function MonthPicker({
  label,
  value,
  onChange,
  required = true,
  min = '',
}: MonthPickerProps): ReactElement {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const validationInput = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const yearInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState('');
  const [showError, setShowError] = useState(false);
  const validYear = /^[1-9]\d{3}$/.test(year);
  const displayValue = value
    ? formatExperienceDate(value)
    : required
      ? 'Choose month and year'
      : 'Present';
  const validationMessage = dateValidationMessage({ value, label, required, min });

  useEffect(() => {
    validationInput.current?.setCustomValidity(validationMessage);
  }, [validationMessage]);

  useEffect(() => {
    if (open) {
      const target =
        panel.current?.querySelector<HTMLButtonElement>(
          'button[aria-pressed="true"]:not(:disabled)',
        ) ?? panel.current?.querySelector<HTMLButtonElement>('button[data-month]:not(:disabled)');
      (target ?? yearInput.current)?.focus();
    }
  }, [open]);

  function close(): void {
    setOpen(false);
    trigger.current?.focus();
  }

  function select(next: string): void {
    setShowError(false);
    onChange(next);
    close();
  }

  function togglePicker(): void {
    if (open) {
      setOpen(false);
      return;
    }
    setYear(initialPickerYear(value, min));
    setOpen(true);
  }

  function moveMonth(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -3,
      ArrowDown: 3,
    };
    const offset = offsets[event.key];
    if (offset === undefined && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const buttons = [
      ...(panel.current?.querySelectorAll<HTMLButtonElement>('button[data-month]') ?? []),
    ];
    if (event.key === 'Home' || event.key === 'End') {
      const enabled = buttons.filter((button) => !button.disabled);
      (event.key === 'Home' ? enabled[0] : enabled.at(-1))?.focus();
      return;
    }
    for (
      let next = index + (offset ?? 0);
      next >= 0 && next < buttons.length;
      next += offset ?? 1
    ) {
      const button = buttons[next];
      if (button && !button.disabled) {
        button.focus();
        break;
      }
    }
  }

  return (
    <div
      className="relative min-w-0 text-ink"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-base font-medium">
          {label}
        </label>
        {!required && <span className="shrink-0 font-mono text-xs text-muted">Optional</span>}
      </div>
      <button
        ref={trigger}
        id={id}
        type="button"
        className={`${controlClass} flex items-center justify-between gap-3 text-left`}
        aria-label={`${label}: ${displayValue}`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-describedby={`${id}-hint${showError && validationMessage ? ` ${id}-error` : ''}`}
        aria-invalid={showError && Boolean(validationMessage)}
        onClick={togglePicker}
      >
        <span>{displayValue}</span>
        <span aria-hidden="true" className="font-mono">
          {open ? '−' : '+'}
        </span>
      </button>
      {/* A non-readonly text control participates in native validation even for year-only values. */}
      <input
        ref={validationInput}
        type="text"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        required={required}
        onChange={() => {}}
        onInvalid={(event) => {
          event.preventDefault();
          setShowError(true);
          trigger.current?.focus();
        }}
      />
      <p id={`${id}-hint`} className="mt-2 text-sm leading-relaxed text-muted">
        {dateHint(value, required)}
      </p>
      {open && (
        <div
          ref={panel}
          id={`${id}-panel`}
          role="group"
          aria-label={`${label} month picker`}
          className="mt-3 border border-muted bg-paper p-3 sm:p-4"
        >
          <label htmlFor={`${id}-year`} className="text-base font-medium">
            Year
          </label>
          <input
            ref={yearInput}
            id={`${id}-year`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={controlClass}
            value={year}
            maxLength={4}
            aria-describedby={`${id}-year-hint`}
            onChange={(event) => setYear(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
          />
          <p id={`${id}-year-hint`} className="mt-2 text-sm text-muted">
            Enter a year from 1000 to 9999, then choose a month.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {EXPERIENCE_MONTHS.map((month, index) => {
              const next = `${year}-${String(index + 1).padStart(2, '0')}`;
              const selected = next === value;
              return (
                <button
                  key={month}
                  type="button"
                  data-month={index}
                  aria-label={validYear ? `${month}, ${year}` : month}
                  aria-pressed={selected}
                  disabled={!validYear || precedesMinimum(next, min)}
                  className={`${buttonClass} bg-paper aria-pressed:bg-ink aria-pressed:text-paper`}
                  onKeyDown={(event) => moveMonth(event, index)}
                  onClick={() => select(next)}
                >
                  <span aria-hidden="true">
                    {month.slice(0, 3)}
                    {selected ? ' ✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-rule pt-3">
            {!required && (
              <button type="button" className={buttonClass} onClick={() => select('')}>
                Clear date / Present
              </button>
            )}
            <button type="button" className={buttonClass} onClick={close}>
              Close
            </button>
          </div>
        </div>
      )}
      {showError && validationMessage && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-ink">
          {validationMessage}
        </p>
      )}
    </div>
  );
}
