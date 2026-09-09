import type { ReactElement, ReactNode } from 'react';

import { Experience } from '../components/experience';
import { SignalStudy } from '../components/signal-study';
import { Layout } from '../layouts/main';
import type { SiteContent } from '../lib/content';
import { photoSource } from '../lib/photo-source';

interface Props { content: SiteContent; year: number; ownerControls?: ReactNode; }

/** Present the owner's story with a monochrome industrial identity. */
export function Home({ content: { profile, site }, year, ownerControls }: Props): ReactElement {
  const nameParts = profile.name.trim().split(/\s+/);
  const lastName = nameParts.pop();
  const initials = profile.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('');
  return <Layout year={year} ownerControls={ownerControls} socialLinks={{ github: site.github, linkedin: site.linkedin }}>
    <div id="home" className="mx-auto max-w-[100rem] px-5 sm:px-10 lg:px-16">
      <header className="flex min-h-24 flex-wrap items-center justify-between gap-x-8 border-b border-rule py-3">
        <a href="#home" aria-label={`${profile.name} home`} className="inline-flex min-h-11 items-center text-3xl font-extrabold tracking-[-0.08em]">{initials}<span aria-hidden="true" className="ml-1 text-base">↗</span></a>
        <nav aria-label="Main navigation" className="flex flex-wrap gap-x-5 font-mono text-xs sm:gap-x-10">
          <a href="#about" className="inline-flex min-h-11 items-center hover:underline underline-offset-8">About</a>
          <a href="#experience" className="inline-flex min-h-11 items-center hover:underline underline-offset-8">Experience</a>
          <a href="#contact" className="inline-flex min-h-11 items-center gap-3 hover:underline underline-offset-8">Contact <span aria-hidden="true">↗</span></a>
        </nav>
      </header>
      <section aria-label="Introduction" className="relative pb-10 pt-12 sm:pb-14 sm:pt-16 lg:pt-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-3 opacity-45"><div className="border-r border-rule" /><div className="border-r border-rule" /></div>
        <h1 className="relative max-w-full break-words text-[clamp(4.2rem,15.8vw,15.5rem)] leading-[0.8] font-extrabold tracking-[-0.065em] uppercase">
          {nameParts.length > 0 && <><span className="block">{nameParts.join(' ')}</span>{' '}</>}
          <span className="block">{lastName}</span>
        </h1>
        <div className="relative mt-10 flex flex-col justify-between gap-6 sm:mt-12 sm:flex-row sm:items-end">
          <p className="max-w-[34rem] text-xl leading-snug sm:text-2xl">{site.tagline}</p>
          <a href="#about" className="flex min-h-11 shrink-0 items-center gap-8 self-start border-b border-ink font-mono text-xs sm:self-auto">Get to know me <span aria-hidden="true" className="text-lg">↓</span></a>
        </div>
      </section>
      <SignalStudy />
      <section id="about" aria-labelledby="about-heading" className="scroll-mt-8 grid gap-10 border-b border-rule py-20 sm:py-28 lg:grid-cols-[1fr_2fr] lg:gap-20">
        <div>
          <h2 id="about-heading" className="max-w-sm text-5xl leading-none font-semibold tracking-[-0.045em] sm:text-6xl">{site.aboutTitle}</h2>
          {profile.photo && <figure className="mt-10 w-44 sm:w-52 lg:mt-16">
            <img src={photoSource(profile.photo.path)} alt={profile.photo.alt} width="416" height="520" className="aspect-[4/5] w-full object-cover grayscale" loading="lazy" />
            <figcaption className="mt-3 font-mono text-xs text-muted">{profile.name}</figcaption>
          </figure>}
        </div>
        <div className="max-w-3xl space-y-7">
          {site.about.map((paragraph, index) => <p key={index} className={index === 0 ? 'text-2xl leading-[1.4] font-medium tracking-[-0.02em] sm:text-3xl' : 'max-w-[42rem] text-lg leading-relaxed text-muted'}>{paragraph}</p>)}
        </div>
      </section>
      <Experience experience={profile.experience} site={site} />
    </div>
    <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-8 bg-night text-chalk">
      <div className="mx-auto grid max-w-[100rem] gap-10 px-5 py-20 sm:px-10 sm:py-24 lg:grid-cols-[1fr_1fr] lg:px-16">
        <h2 id="contact-heading" className="text-[clamp(4rem,9vw,8rem)] leading-[0.9] font-semibold tracking-[-0.05em]">{site.contactTitle}<span aria-hidden="true">.</span></h2>
        <div className="flex flex-col items-start lg:pt-2">
          <p className="mb-8 max-w-md text-2xl leading-snug text-night-muted">{site.contactIntro}</p>
          {site.email && <a className="flex min-h-12 max-w-full items-center gap-4 border-b border-night-rule pb-2 text-[clamp(1.05rem,2.1vw,1.8rem)] hover:text-white" href={`mailto:${site.email}`}><span className="break-all">{site.email}</span><span aria-hidden="true">↗</span></a>}
          {site.phone && site.phoneHref && <a className="mt-5 flex min-h-11 items-center font-mono text-sm text-night-muted hover:text-white" href={site.phoneHref}>{site.phone}</a>}
          {!site.email && !site.phone && <a href="#social-links" className="inline-flex min-h-12 items-center gap-6 border-b border-night-rule font-mono text-sm hover:text-white">Find me online <span aria-hidden="true">↓</span></a>}
        </div>
      </div>
    </section>
  </Layout>;
}
