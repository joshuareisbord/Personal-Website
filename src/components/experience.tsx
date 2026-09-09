import type { ReactElement } from 'react';

import type { Profile } from '../lib/profile';
import type { SiteCopy } from '../lib/content';
import { formatExperienceDate } from '../lib/dates';
import { ExperienceGlobe } from './experience-globe';

interface Props { experience: Profile['experience']; site: SiteCopy; }

/** Present work experience as a chronology rather than project cards. */
export function Experience({ experience, site }: Props): ReactElement {
  return <section id="experience" aria-labelledby="experience-heading" className="scroll-mt-8 py-20 sm:py-28">
    <h2 id="experience-heading" className="mb-12 max-w-3xl text-5xl leading-none font-semibold tracking-[-0.045em] sm:mb-16 sm:text-6xl">{site.experienceTitle}</h2>
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
    <div className="min-w-0 lg:sticky lg:top-8"><ExperienceGlobe experience={experience} /></div>
    {experience.length > 0 ? <ol className="min-w-0 border-t border-ink">
      {experience.map((role, index) => <li key={index} className="grid gap-5 border-b border-rule py-8 sm:py-10">
        <p className="flex flex-wrap gap-x-2 self-start pt-1 font-mono text-xs leading-relaxed text-muted">
          <time dateTime={role.startDate}>{formatExperienceDate(role.startDate)}</time><span aria-hidden="true">—</span>
          {role.endDate ? <time dateTime={role.endDate}>{formatExperienceDate(role.endDate)}</time> : <span>Present</span>}
        </p>
        <div className="min-w-0">
          <h3 className="break-words text-3xl leading-tight font-medium tracking-[-0.025em] sm:text-4xl">{role.title}</h3>
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-lg">{role.company}{role.location && <span className="text-muted">/ {role.location}</span>}</p>
          {role.description && <p className="mt-6 max-w-[42rem] text-lg leading-relaxed whitespace-pre-line text-muted">{role.description}</p>}
        </div>
      </li>)}
    </ol> : <div className="grid gap-4 border-t border-ink py-8">
      <p className="font-mono text-xs text-muted">Work history</p>
      <p className="max-w-xl text-xl leading-relaxed text-muted">For my current background and experience, visit LinkedIn using the link below.</p>
    </div>}
    </div>
  </section>;
}
