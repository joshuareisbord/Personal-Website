import { useEffect, type RefObject } from 'react';

/** Animate the signal drawing with scroll momentum, visibility pausing, and complete cleanup. */
export function useSignalMotion(
  container: RefObject<HTMLDivElement | null>,
  lines: RefObject<SVGGElement | null>,
): void {
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
        drawing.setAttribute(
          'transform',
          `translate(865 ${240 + Math.sin((phase * Math.PI) / 180) * 6}) rotate(${-24 + phase})`,
        );
      }
      previousTime = timestamp;
      frame = window.requestAnimationFrame(update);
    };
    const synchronize = (): void => {
      const bounds = region.getBoundingClientRect();
      active =
        !reducedMotion.matches &&
        !document.hidden &&
        bounds.bottom > 0 &&
        bounds.top < window.innerHeight;
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
  }, [container, lines]);
}
