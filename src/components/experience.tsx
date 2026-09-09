import type { ReactElement } from 'react';

import type { Profile } from '../lib/profile';
import type { SiteCopy } from '../lib/content';

interface Props { experience: Profile['experience']; site: SiteCopy; }
function formatDate(value: string): string {
  if (value.length === 4) return value;
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T00:00:00Z`));
}

/** Present work experience as a chronology rather than project cards. */
export function Experience({ experience, site }: Props): ReactElement {
  return <section id="experience" aria-labelledby="experience-heading" className="scroll-mt-8 py-20 sm:py-28">
    <h2 id="experience-heading" className="mb-12 max-w-3xl text-5xl leading-none font-semibold tracking-[-0.045em] sm:mb-16 sm:text-6xl">{site.experienceTitle}</h2>
    {experience.length > 0 ? <ol className="border-t border-ink">
      {experience.map((role, index) => <li key={index} className="grid gap-5 border-b border-rule py-8 sm:py-10 lg:grid-cols-[1fr_2fr] lg:gap-20">
        <p className="flex flex-wrap gap-x-2 self-start pt-1 font-mono text-xs leading-relaxed text-muted">
          <time dateTime={role.startDate}>{formatDate(role.startDate)}</time><span aria-hidden="true">—</span>
          {role.endDate ? <time dateTime={role.endDate}>{formatDate(role.endDate)}</time> : <span>Present</span>}
        </p>
        <div className="min-w-0">
          <h3 className="break-words text-3xl leading-tight font-medium tracking-[-0.025em] sm:text-4xl">{role.title}</h3>
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-lg">{role.company}{role.location && <span className="text-muted">/ {role.location}</span>}</p>
          {role.description && <p className="mt-6 max-w-[42rem] text-lg leading-relaxed whitespace-pre-line text-muted">{role.description}</p>}
        </div>
      </li>)}
    </ol> : <div className="grid gap-4 border-t border-ink py-8 lg:grid-cols-[1fr_2fr] lg:gap-20">
      <p className="font-mono text-xs text-muted">Work history</p>
      <p className="max-w-xl text-xl leading-relaxed text-muted">For my current background and experience, visit LinkedIn using the link below.</p>
    </div>}
  </section>;
}
