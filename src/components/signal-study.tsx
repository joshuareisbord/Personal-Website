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
    let lastScroll = window.scrollY;
    let phase = 0;
    let scrollVelocity = 0;
    let previousTime: number | undefined;
    let active = false;
    const update = (timestamp: number): void => {
      frame = 0;
      if (!active) return;
      if (previousTime !== undefined) {
        const seconds = Math.min(0.05, Math.max(0, (timestamp - previousTime) / 1000));
        const decay = Math.exp(-seconds / 0.22);
        phase = (phase + 0.35 * seconds + scrollVelocity * 0.22 * (1 - decay)) % 360;
        scrollVelocity *= decay;
        drawing.setAttribute('transform', `translate(865 ${240 + Math.sin(phase * Math.PI / 180) * 6}) rotate(${-24 + phase})`);
      }
      previousTime = timestamp;
      frame = window.requestAnimationFrame(update);
    };
    const synchronize = (): void => {
      const bounds = region.getBoundingClientRect();
      active = !reducedMotion.matches && !document.hidden && bounds.bottom > 0 && bounds.top < window.innerHeight;
      if (active) {
        if (!frame) frame = window.requestAnimationFrame(update);
      } else {
        window.cancelAnimationFrame(frame);
        frame = 0;
        previousTime = undefined;
        scrollVelocity = 0;
      }
    };
    const scroll = (): void => {
      const delta = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      const wasActive = active;
      synchronize();
      if (!active || !wasActive || delta === 0) return;
      if (Math.sign(delta) !== Math.sign(scrollVelocity)) scrollVelocity = 0;
      scrollVelocity = Math.max(-12, Math.min(12, scrollVelocity + delta * 0.12));
    };
    const resize = (): void => {
      lastScroll = window.scrollY;
      synchronize();
    };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', resize);
    reducedMotion.addEventListener('change', resize);
    synchronize();
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', resize);
      reducedMotion.removeEventListener('change', resize);
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
