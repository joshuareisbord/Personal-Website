import { z } from 'zod';

import { photoCropSchema } from './photo-crop';
import { isPublicHttpsUrl } from './urls';

const requiredText = z
  .string()
  .min(1)
  .max(500)
  .refine((value) => value.trim().length > 0);
const experienceDate = z.string().regex(/^[1-9]\d{3}(?:-(?:0[1-9]|1[0-2]))?$/);
const officeSchema = z
  .object({
    address: requiredText,
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .strict();

/** An optional exact office location, separate from the public city label. */
export type WorkOffice = z.infer<typeof officeSchema>;

const placeSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    regionCode: z.string().min(1).max(20).optional(),
    city: requiredText.optional(),
    office: officeSchema.optional(),
  })
  .strict()
  .refine((place) => !place.office || Boolean(place.city), {
    message: 'An office needs a selected city.',
    path: ['city'],
  });

/** A selected geographic location stored with the published work history. */
export type WorkPlace = z.infer<typeof placeSchema>;

const experienceSchema = z
  .object({
    company: requiredText,
    title: requiredText,
    location: requiredText.optional(),
    place: placeSchema.optional(),
    description: z.string().min(1).max(20_000).optional(),
    startDate: experienceDate,
    endDate: experienceDate.nullable(),
  })
  .strict()
  .refine((entry) => !entry.place || Boolean(entry.location), {
    message: 'A work place needs a location label.',
  })
  .refine(
    (entry) => {
      if (entry.endDate === null) return true;
      const earliestStart =
        entry.startDate.length === 4 ? `${entry.startDate}-01` : entry.startDate;
      const latestEnd = entry.endDate.length === 4 ? `${entry.endDate}-12` : entry.endDate;
      return latestEnd >= earliestStart;
    },
    { message: 'Experience end date precedes start date.' },
  );

/** One authored role, including its dates and optional map location. */
export type WorkExperience = z.infer<typeof experienceSchema>;

function isProfilePhotoPath(value: string): boolean {
  const isLocalPhoto = /^\/profile\/[A-Za-z0-9][A-Za-z0-9_-]*\.(?:webp|png|jpg)$/.test(value);
  return isLocalPhoto || isPublicHttpsUrl(value);
}

const profileSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: requiredText,
    photo: z
      .object({
        path: z.string().max(2000).refine(isProfilePhotoPath),
        alt: requiredText,
        crop: photoCropSchema.optional(),
      })
      .strict()
      .nullable(),
    experience: z.array(experienceSchema).max(100),
  })
  .strict();

/** Public identity and work history. */
export type Profile = z.infer<typeof profileSchema>;

/** Validate the exact public profile contract without accepting unknown fields. */
export function parseProfile(value: unknown): Profile {
  const result = profileSchema.safeParse(value);
  if (!result.success) throw new Error('Invalid public profile snapshot.');
  return result.data;
}
