import type { ReactElement, ReactNode } from 'react';

interface Props { children: ReactNode; year: number; ownerControls?: ReactNode; }

/** Share the page shell and quiet owner entry point across public routes. */
export function Layout({ children, year, ownerControls }: Props): ReactElement {
  return <>
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-paper focus:p-4 focus:text-ink">Skip to content</a>
    <main id="main">{children}</main>
    <footer id="footer" className="bg-night text-chalk">
      <div className="mx-auto max-w-[100rem] px-5 pb-4 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-4 border-t border-night-rule pt-6 pb-3 font-mono text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-night-muted">© {year}. All rights reserved.</p>
          <a href="/#home" aria-label="Back to top" className="inline-flex min-h-11 items-center gap-3 self-start hover:underline underline-offset-8 sm:self-auto">Back to top <span aria-hidden="true">↑</span></a>
        </div>
        <div className="flex justify-start sm:justify-end">{ownerControls}</div>
      </div>
    </footer>
  </>;
}
