import type { ReactElement, ReactNode } from 'react';

import { mdiGithub, mdiLinkedin } from '@mdi/js';

interface Props { children: ReactNode; year: number; ownerControls?: ReactNode; socialLinks?: { github: string; linkedin: string }; }

/** Share the page shell and quiet owner entry point across public routes. */
export function Layout({ children, year, ownerControls, socialLinks }: Props): ReactElement {
  return <>
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-paper focus:p-4 focus:text-ink">Skip to content</a>
    <main id="main">{children}</main>
    <footer id="footer" className="bg-night text-chalk">
      <div className="mx-auto max-w-[100rem] px-5 pb-4 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-4 border-t border-night-rule pt-6 pb-3 font-mono text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-night-muted">© {year}. All rights reserved.</p>
          {socialLinks && <nav id="social-links" aria-label="Social links" className="flex gap-3">
            {[{ name: 'GitHub', href: socialLinks.github, icon: mdiGithub }, { name: 'LinkedIn', href: socialLinks.linkedin, icon: mdiLinkedin }].map((social) => <a key={social.name} href={social.href} aria-label={social.name} title={social.name} target="_blank" rel="noopener noreferrer" className="inline-flex size-12 items-center justify-center border border-transparent text-night-muted transition-colors hover:border-night-rule hover:text-chalk motion-reduce:transition-none">
              <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true" focusable="false"><path d={social.icon} /></svg>
            </a>)}
          </nav>}
          <a href="/home#home" aria-label="Back to top" className="inline-flex min-h-11 items-center gap-3 self-start hover:underline underline-offset-8 sm:self-auto">Back to top <span aria-hidden="true">↑</span></a>
        </div>
        <div className="flex justify-start sm:justify-end">{ownerControls}</div>
      </div>
    </footer>
  </>;
}
