import { useEffect, useRef, type ReactElement } from 'react';

/** An original vector study of intersecting signals, with no external imagery. */
export function SignalStudy(): ReactElement {
  const container = useRef<HTMLDivElement>(null);
  const lines = useRef<SVGGElement>(null);
  useEffect(() => {
    const region = container.current;
    const drawing = lines.current;
    if (!region || !drawing) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const update = (): void => {
      frame = 0;
      const bounds = region.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
      const progress = Math.max(-1, Math.min(1,
        (window.innerHeight / 2 - bounds.top - bounds.height / 2) / ((window.innerHeight + bounds.height) / 2)));
      drawing.setAttribute('transform', `translate(865 ${240 + progress * 12}) rotate(${-24 + progress * 5})`);
    };
    const schedule = (): void => {
      if (!reducedMotion.matches && !frame) frame = window.requestAnimationFrame(update);
    };
    const preferenceChanged = (): void => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      drawing.setAttribute('transform', 'translate(865 240) rotate(-24)');
      schedule();
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    reducedMotion.addEventListener('change', preferenceChanged);
    schedule();
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      reducedMotion.removeEventListener('change', preferenceChanged);
    };
  }, []);
  return <div ref={container} aria-hidden="true" className="relative isolate h-64 overflow-hidden bg-night sm:h-80 lg:h-[25rem]">
    <svg viewBox="0 0 1400 460" fill="none" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="signal-grain" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.65" fill="currentColor" /></pattern>
        <pattern id="signal-grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" stroke="currentColor" strokeWidth="0.5" /></pattern>
        <clipPath id="signal-crop"><rect width="1400" height="460" /></clipPath>
      </defs>
      <g className="text-chalk" clipPath="url(#signal-crop)">
        <rect width="1400" height="460" fill="url(#signal-grain)" opacity="0.11" />
        <rect width="1400" height="460" fill="url(#signal-grid)" opacity="0.1" />
        <g ref={lines} transform="translate(865 240) rotate(-24)" stroke="currentColor" strokeWidth="0.75">
          {Array.from({ length: 26 }, (_, index) => <ellipse key={index} rx={95 + index * 11} ry={235 - index * 4.7} opacity={0.22 + index / 70} transform={`rotate(${index * 3.2})`} />)}
          <ellipse rx="550" ry="110" strokeWidth="1.2" opacity="0.8" />
          <ellipse rx="640" ry="146" opacity="0.35" />
        </g>
        <path d="M0 335H1400M280 0V460" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
        <path d="M260 335h40m-20-20v40M1180 85h24m-12-12v24" stroke="currentColor" opacity="0.65" />
        <circle cx="280" cy="335" r="5" fill="currentColor" />
        <path d="M34 54V30h24M1342 30h24v24M34 406v24h24M1342 430h24v-24" stroke="currentColor" opacity="0.65" />
      </g>
    </svg>
  </div>;
}
