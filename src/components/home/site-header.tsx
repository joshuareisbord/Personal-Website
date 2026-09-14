import type { ReactElement } from 'react';
import { LinkArrow } from '../link-arrow';
interface SiteHeaderProps {
  name: string;
}
/** Show the owner's initials and links to each public section. */
export function SiteHeader({ name }: SiteHeaderProps): ReactElement {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  return (
    <header className="flex min-h-24 flex-wrap items-center justify-between gap-x-8 border-b border-rule py-3">
      <a
        href="#home"
        aria-label={`${name} home`}
        className="inline-flex min-h-11 items-center text-3xl font-extrabold tracking-[-0.08em]"
      >
        {initials}
        <LinkArrow className="ml-1 text-base" />
      </a>
      <nav
        aria-label="Main navigation"
        className="flex flex-wrap gap-x-5 font-mono text-xs sm:gap-x-10"
      >
        <a
          href="#about"
          className="inline-flex min-h-11 items-center hover:underline underline-offset-8"
        >
          About
        </a>
        <a
          href="#experience"
          className="inline-flex min-h-11 items-center hover:underline underline-offset-8"
        >
          Experience
        </a>
        <a
          href="#contact"
          className="inline-flex min-h-11 items-center gap-3 hover:underline underline-offset-8"
        >
          Contact <LinkArrow />
        </a>
      </nav>
    </header>
  );
}
