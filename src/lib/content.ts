import { z } from 'zod';

import { parseProfile, type Profile } from './profile';

const text = z.string().trim().min(1).max(500);
const httpsUrl = z.string().max(2000).refine((value) => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}, 'Use an HTTPS link.');
const siteSchema = z.object({
  tagline: text,
  about: z.array(z.string().trim().min(1).max(20_000)).min(1).max(30),
  aboutTitle: text,
  experienceTitle: text,
  contactTitle: text,
  contactIntro: text,
  email: z.string().trim().pipe(z.union([z.literal(''), z.email().max(254)])).default(''),
  phone: z.string().trim().max(500).default(''),
  phoneHref: z.string().trim().pipe(z.union([
    z.literal(''),
    z.string().regex(/^tel:\+?[0-9 ()-]{3,30}$/).refine((value) => value.replace(/\D/g, '').length >= 3, 'Enter a valid phone number.'),
  ])).default(''),
  github: httpsUrl,
  linkedin: httpsUrl,
}).strict().refine((site) => Boolean(site.phone) === Boolean(site.phoneHref), {
  message: 'Provide both a phone number and its call link, or leave both blank.', path: ['phone'],
});
const envelopeSchema = z.object({ profile: z.unknown(), site: siteSchema }).strict();

export type SiteCopy = z.infer<typeof siteSchema>;
export interface SiteContent { profile: Profile; site: SiteCopy; }

/** Validate owner input and published Firestore content before rendering it. */
export function parseContent(value: unknown): SiteContent {
  const envelope = envelopeSchema.parse(value);
  const content = { profile: parseProfile(envelope.profile), site: envelope.site };
  if (new TextEncoder().encode(JSON.stringify(content)).length > 200_000) throw new Error('Content is too large. Shorten the text and try again.');
  return content;
}

/** Serialize a complete validated publication. */
export function serializeContent(content: SiteContent): string {
  return JSON.stringify(parseContent(content));
}
