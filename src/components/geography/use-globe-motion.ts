import { useEffect, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';

import type { GlobeView } from './globe-view';

/** Own globe frame scheduling and motion-preference listeners without resetting the camera. */
export function useGlobeMotion(
  drawing: RefObject<SVGSVGElement | null>,
  paused: boolean,
  dragging: boolean,
  setView: Dispatch<SetStateAction<GlobeView>>,
): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const synchronize = (): void => setReducedMotion(preference.matches);
    synchronize();
    preference.addEventListener('change', synchronize);
    return () => preference.removeEventListener('change', synchronize);
  }, []);
  useEffect(() => {
    const container = drawing.current;
    if (!container) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let previousTime: number | undefined;
    let visible = false;
    const update = (timestamp: number): void => {
      frame = 0;
      if (!visible || document.hidden || preference.matches || paused || dragging) return;
      if (previousTime === undefined) previousTime = timestamp;
      const seconds = Math.min((timestamp - previousTime) / 1000, 0.1);
      // Limit projection work to 25 frames/sec without changing the speed of motion.
      if (seconds >= 0.04) {
        previousTime = timestamp;
        setView((current) => ({
          ...current,
          rotation: [(current.rotation[0] + seconds * 1.5) % 360, current.rotation[1]],
          elapsed: current.elapsed + seconds,
        }));
      }
      frame = window.requestAnimationFrame(update);
    };
    const synchronize = (): void => {
      const bounds = container.getBoundingClientRect();
      visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
      if (visible && !document.hidden && !preference.matches && !paused && !dragging) {
        if (!frame) frame = window.requestAnimationFrame(update);
      } else {
        window.cancelAnimationFrame(frame);
        frame = 0;
        previousTime = undefined;
      }
    };
    const observer =
      'IntersectionObserver' in window ? new IntersectionObserver(synchronize) : null;
    observer?.observe(container);
    window.addEventListener('scroll', synchronize, { passive: true });
    window.addEventListener('resize', synchronize, { passive: true });
    document.addEventListener('visibilitychange', synchronize);
    preference.addEventListener('change', synchronize);
    synchronize();
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('scroll', synchronize);
      window.removeEventListener('resize', synchronize);
      document.removeEventListener('visibilitychange', synchronize);
      preference.removeEventListener('change', synchronize);
    };
  }, [drawing, paused, dragging, setView]);

  return reducedMotion;
}
