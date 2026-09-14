import type { ReactElement } from 'react';
interface IntroductionProps {
  name: string;
  tagline: string;
}
/** Introduce the owner and lead visitors into the biography. */
export function Introduction({ name, tagline }: IntroductionProps): ReactElement {
  const nameParts = name.trim().split(/\s+/);
  const lastName = nameParts.pop();
  return (
    <section aria-label="Introduction" className="relative pb-10 pt-12 sm:pb-14 sm:pt-16 lg:pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid grid-cols-3 opacity-45"
      >
        <div className="border-r border-rule" />
        <div className="border-r border-rule" />
      </div>
      <h1 className="relative max-w-full break-words text-[clamp(4.2rem,15.8vw,15.5rem)] leading-[0.8] font-extrabold tracking-[-0.065em] uppercase">
        {nameParts.length > 0 && (
          <>
            <span className="block">{nameParts.join(' ')}</span>{' '}
          </>
        )}
        <span className="block">{lastName}</span>
      </h1>
      <div className="relative mt-10 flex flex-col justify-between gap-6 sm:mt-12 sm:flex-row sm:items-end">
        <p className="max-w-[34rem] text-xl leading-snug sm:text-2xl">{tagline}</p>
        <a
          href="#about"
          className="flex min-h-11 shrink-0 items-center gap-8 self-start border-b border-ink font-mono text-xs sm:self-auto"
        >
          Get to know me{' '}
          <span aria-hidden="true" className="text-lg">
            ↓
          </span>
        </a>
      </div>
    </section>
  );
}
