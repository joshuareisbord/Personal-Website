import type { ReactElement, ReactNode } from 'react';

import { Experience } from '../components/experience';
import { About } from '../components/home/about';
import { Contact } from '../components/home/contact';
import { Introduction } from '../components/home/introduction';
import { SiteHeader } from '../components/home/site-header';
import { SignalStudy } from '../components/signal-study';
import { Layout } from '../layouts/main';
import type { SiteContent } from '../lib/content';

interface HomeProps {
  content: SiteContent;
  year: number;
  ownerControls?: ReactNode;
}

/** Compose the public sections; each section owns its own presentation. */
export function Home({ content: { profile, site }, year, ownerControls }: HomeProps): ReactElement {
  return (
    <Layout year={year} ownerControls={ownerControls}>
      <div id="home" className="mx-auto max-w-[100rem] px-5 sm:px-10 lg:px-16">
        <SiteHeader name={profile.name} />
        <Introduction name={profile.name} tagline={site.tagline} />
        <SignalStudy />
        <About profile={profile} site={site} />
        <Experience experience={profile.experience} site={site} />
      </div>
      <Contact site={site} />
    </Layout>
  );
}
