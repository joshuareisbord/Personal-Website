import { z } from 'zod';

const requiredText = z.string().min(1).max(500).refine((value) => value.trim().length > 0);
const date = z.string().regex(/^[1-9]\d{3}(?:-(?:0[1-9]|1[0-2]))?$/);

const experienceSchema = z.object({
  company: requiredText,
  title: requiredText,
  location: requiredText.optional(),
  description: z.string().min(1).max(20_000).optional(),
  startDate: date,
  endDate: date.nullable(),
}).strict().refine((entry) => {
  if (entry.endDate === null) return true;
  const earliestStart = entry.startDate.length === 4 ? `${entry.startDate}-01` : entry.startDate;
  const latestEnd = entry.endDate.length === 4 ? `${entry.endDate}-12` : entry.endDate;
  return latestEnd >= earliestStart;
}, { message: 'Experience end date precedes start date.' });

const profileSchema = z.object({
  schemaVersion: z.literal(1),
  name: requiredText,
  photo: z.object({
    path: z.string().max(2000).refine((value) => /^\/profile\/[A-Za-z0-9][A-Za-z0-9_-]*\.(?:webp|png|jpg)$/.test(value) || (() => {
      try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
    })()),
    alt: requiredText,
  }).strict().nullable(),
  experience: z.array(experienceSchema).max(100),
}).strict();

/** Public identity and work history. */
export type Profile = z.infer<typeof profileSchema>;

/** Validate the exact public profile contract without accepting unknown fields. */
export function parseProfile(value: unknown): Profile {
  const result = profileSchema.safeParse(value);
  if (!result.success) throw new Error('Invalid public profile snapshot.');
  return result.data;
}
