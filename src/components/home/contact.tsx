import { mdiGithub, mdiLinkedin } from '@mdi/js';
import type { ReactElement } from 'react';
import type { SiteCopy } from '../../lib/content';
import { LinkArrow } from '../link-arrow';
interface ContactProps {
  site: Pick<
    SiteCopy,
    'contactTitle' | 'contactIntro' | 'email' | 'phone' | 'phoneHref' | 'linkedin' | 'github'
  >;
}
/** Display optional contact methods followed by the owner's social links. */
export function Contact({ site }: ContactProps): ReactElement {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="scroll-mt-8 bg-night text-chalk"
    >
      <div className="mx-auto grid max-w-[100rem] gap-10 px-5 py-20 sm:px-10 sm:py-24 lg:grid-cols-[1fr_1fr] lg:px-16">
        <h2
          id="contact-heading"
          className="text-[clamp(4rem,9vw,8rem)] leading-[0.9] font-semibold tracking-[-0.05em]"
        >
          {site.contactTitle}
          <span aria-hidden="true">.</span>
        </h2>
        <div className="flex flex-col items-start lg:pt-2">
          <p className="mb-8 max-w-md text-2xl leading-snug text-night-muted">
            {site.contactIntro}
          </p>
          {site.email && (
            <a
              className="flex min-h-12 max-w-full items-center gap-4 border-b border-night-rule pb-2 text-[clamp(1.05rem,2.1vw,1.8rem)] hover:text-white"
              href={`mailto:${site.email}`}
            >
              <span className="break-all">{site.email}</span>
              <LinkArrow />
            </a>
          )}
          {site.phone && site.phoneHref && (
            <a
              className="mt-5 flex min-h-11 items-center font-mono text-sm text-night-muted hover:text-white"
              href={site.phoneHref}
            >
              {site.phone}
            </a>
          )}
          <nav
            id="social-links"
            aria-labelledby="social-heading"
            className={site.email || site.phone ? 'mt-8' : ''}
          >
            <p id="social-heading" className="font-mono text-sm text-night-muted">
              Find me online
            </p>
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
              {[
                { name: 'LinkedIn', href: site.linkedin, icon: mdiLinkedin },
                { name: 'GitHub', href: site.github, icon: mdiGithub },
              ].map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center gap-3 border-b border-night-rule font-mono text-sm transition-colors hover:text-white motion-reduce:transition-none"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-6"
                    fill="currentColor"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d={social.icon} />
                  </svg>
                  {social.name}
                  <LinkArrow />
                </a>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </section>
  );
}
