import type { Map as LeafletMap } from 'leaflet';

/** Remove document listeners and queued frames owned by an in-progress Leaflet pinch. */
export function releaseActivePinch(leaflet: typeof import('leaflet'), instance: LeafletMap): void {
  // Leaflet 1.9 removes touchstart on teardown, but an active pinch also owns document listeners.
  const pinch = instance.touchZoom as typeof instance.touchZoom & {
    _onTouchMove?: (event: Event) => void;
    _onTouchEnd?: (event: Event) => void;
    _animRequest?: number;
  };
  // Its public types omit Document even though Leaflet itself uses it as an event target.
  const off = leaflet.DomEvent.off as typeof leaflet.DomEvent.off &
    ((target: Document, events: string, handler: (event: Event) => void, context: object) => void);
  if (pinch._onTouchMove) off(document, 'touchmove', pinch._onTouchMove, pinch);
  if (pinch._onTouchEnd) off(document, 'touchend touchcancel', pinch._onTouchEnd, pinch);
  if (pinch._animRequest !== undefined) leaflet.Util.cancelAnimFrame(pinch._animRequest);
}

/** Let one finger scroll the page while preserving mouse drag and Leaflet's two-finger handling. */
export function installStreetTouchPolicy(
  container: HTMLDivElement,
  instance: LeafletMap,
): () => void {
  // A single touch scrolls the page; Leaflet's two-finger handler owns pinch/pan.
  const touchStart = (): void => {
    instance.dragging.disable();
  };
  const pointerStart = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') instance.dragging.enable();
  };
  container.addEventListener('touchstart', touchStart, { capture: true, passive: true });
  container.addEventListener('pointerdown', pointerStart, true);
  return () => {
    container.removeEventListener('touchstart', touchStart, true);
    container.removeEventListener('pointerdown', pointerStart, true);
  };
}

interface StreetViewport {
  synchronizeMotion: () => void;
  dispose: () => void;
}

/** Keep route animation and map dimensions in sync with visibility and motion preferences. */
export function observeStreetViewport(
  container: HTMLDivElement,
  instance: LeafletMap,
  reduced: MediaQueryList,
): StreetViewport {
  let visible = !('IntersectionObserver' in window);
  const synchronizeMotion = (): void => {
    container.dataset.motion =
      visible && !document.hidden && !reduced.matches ? 'running' : 'paused';
  };
  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => {
          visible = Boolean(entry?.isIntersecting);
          synchronizeMotion();
        })
      : undefined;
  observer?.observe(container);
  document.addEventListener('visibilitychange', synchronizeMotion);
  reduced.addEventListener('change', synchronizeMotion);
  const resize =
    'ResizeObserver' in window
      ? new ResizeObserver(() => {
          instance.invalidateSize({ animate: false, pan: false });
        })
      : undefined;
  resize?.observe(container);
  const dispose = (): void => {
    observer?.disconnect();
    resize?.disconnect();
    document.removeEventListener('visibilitychange', synchronizeMotion);
    reduced.removeEventListener('change', synchronizeMotion);
  };
  return { synchronizeMotion, dispose };
}
