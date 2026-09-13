/** English month names shared by the picker and public experience dates. */
export const EXPERIENCE_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Accept the profile's year or year-month contract without normalizing precision. */
export function isExperienceDate(value: string): boolean {
  return /^[1-9]\d{3}(?:-(?:0[1-9]|1[0-2]))?$/.test(value);
}

/** Format full English months, retaining unknown months and malformed input verbatim. */
export function formatExperienceDate(value: string): string {
  if (!value) return 'Present';
  if (!isExperienceDate(value) || value.length === 4) return value;
  return `${EXPERIENCE_MONTHS[Number(value.slice(5)) - 1]}, ${value.slice(0, 4)}`;
}
