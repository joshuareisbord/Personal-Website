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
    let current = 0;
    let from = 0;
    let target = 0;
    let startedAt = 0;
    const update = (timestamp: number): void => {
      frame = 0;
      const progress = Math.min(1, Math.max(0, (timestamp - startedAt) / 180));
      current = from + (target - from) * (1 - (1 - progress) ** 3);
      drawing.setAttribute('transform', `translate(865 ${240 + current * 8}) rotate(${-24 + current * 3})`);
      if (progress < 1) frame = window.requestAnimationFrame(update);
    };
    const scroll = (): void => {
      const delta = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      if (reducedMotion.matches || delta === 0) return;
      const bounds = region.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
      const next = Math.max(-1, Math.min(1, target + delta / Math.max(1, window.innerHeight + bounds.height)));
      if (next === target) return;
      from = current;
      target = next;
      startedAt = window.performance.now();
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const resize = (): void => {
      lastScroll = window.scrollY;
      window.cancelAnimationFrame(frame);
      frame = 0;
      target = current;
    };
    const preferenceChanged = (): void => {
      resize();
      current = from = target = 0;
      drawing.setAttribute('transform', 'translate(865 240) rotate(-24)');
    };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    reducedMotion.addEventListener('change', preferenceChanged);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
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
