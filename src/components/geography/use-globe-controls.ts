import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';

import type { Coordinates, WorkJourney } from '../../lib/work-journey';
import { globeRotation, type GlobeView, type StreetView } from './globe-view';
import { useGlobeMotion } from './use-globe-motion';

interface GlobeDrag {
  pointerId: number;
  startX: number;
  startY: number;
  rotation: Coordinates;
  hasMoved: boolean;
  isTouch: boolean;
}

export interface GlobeControls {
  drawing: RefObject<SVGSVGElement | null>;
  ignoreClick: RefObject<boolean>;
  view: GlobeView;
  paused: boolean;
  reducedMotion: boolean;
  details: StreetView | null;
  canOpenStreet: boolean;
  rotate: (horizontal: number, vertical: number) => void;
  zoom: (delta: number) => void;
  reset: () => void;
  pause: () => void;
  togglePaused: () => void;
  openStreet: () => void;
  returnToGlobe: (coordinates: Coordinates) => void;
  handleKey: (event: KeyboardEvent<SVGSVGElement>) => void;
  handlePointerDown: (event: PointerEvent<SVGSVGElement>) => void;
  handlePointerMove: (event: PointerEvent<SVGSVGElement>) => void;
  endDrag: (event: PointerEvent<SVGSVGElement>) => void;
  cancelDrag: () => void;
}

/** Keep selection, pointer/keyboard camera controls, and street-view transitions together. */
export function useGlobeControls(
  journey: WorkJourney,
  selected: number | undefined,
): GlobeControls {
  const drawing = useRef<SVGSVGElement>(null);
  const drag = useRef<GlobeDrag | null>(null);
  const ignoreClick = useRef(false);
  const previousSelection = useRef(selected);
  const [view, setView] = useState<GlobeView>(() => ({
    rotation: globeRotation(journey.stops.find((stop) => stop.index === selected)?.coordinates),
    zoom: 1,
    elapsed: 0,
  }));
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [details, setDetails] = useState<StreetView | null>(null);
  const wasShowingStreetView = useRef(false);
  useEffect(() => {
    if (!details && wasShowingStreetView.current) drawing.current?.focus({ preventScroll: true });
    wasShowingStreetView.current = Boolean(details);
  }, [details]);
  useEffect(() => {
    if (previousSelection.current === selected) return;
    previousSelection.current = selected;
    const coordinates = journey.stops.find((stop) => stop.index === selected)?.coordinates;
    if (coordinates) setView((current) => ({ ...current, rotation: globeRotation(coordinates) }));
    setPaused(true);
  }, [selected, journey]);

  const reducedMotion = useGlobeMotion(drawing, paused, dragging, setView);
  const center: Coordinates = [-view.rotation[0], -view.rotation[1]];
  const selectedCoordinates = journey.stops.find((stop) => stop.index === selected)?.coordinates;
  const rotate = (horizontal: number, vertical: number): void => {
    setPaused(true);
    setView((current) => ({
      ...current,
      rotation: [
        (current.rotation[0] + horizontal) % 360,
        Math.max(-85, Math.min(85, current.rotation[1] + vertical)),
      ],
    }));
  };
  const zoom = (delta: number): void => {
    setPaused(true);
    const enteringStreetView = delta > 0 && view.zoom >= 1.6;
    if (enteringStreetView) {
      setDetails({ center, zoom: 4 });
      return;
    }
    setView((current) => ({
      ...current,
      zoom: Math.max(0.8, Math.min(1.6, Math.round((current.zoom + delta) * 10) / 10)),
    }));
  };
  const reset = (): void => {
    setView({
      rotation: globeRotation(journey.stops.find((stop) => stop.index === selected)?.coordinates),
      zoom: 1,
      elapsed: 0,
    });
    setPaused(true);
  };
  const handleKey = (event: KeyboardEvent<SVGSVGElement>): void => {
    if (event.target !== event.currentTarget) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => rotate(-12, 0),
      ArrowRight: () => rotate(12, 0),
      ArrowUp: () => rotate(0, 10),
      ArrowDown: () => rotate(0, -10),
      '+': () => zoom(0.1),
      '=': () => zoom(0.1),
      '-': () => zoom(-0.1),
      Home: reset,
      ' ': () => setPaused((value) => !value),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };
  const handlePointerDown = (event: PointerEvent<SVGSVGElement>): void => {
    ignoreClick.current = false;
    if (event.button !== 0) return;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rotation: view.rotation,
      hasMoved: false,
      isTouch: event.pointerType === 'touch',
    };
    setPaused(true);
    setDragging(true);
  };
  const handlePointerMove = (event: PointerEvent<SVGSVGElement>): void => {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const horizontalDistance = event.clientX - start.startX;
    const verticalDistance = event.clientY - start.startY;
    const belowDragThreshold = Math.hypot(horizontalDistance, verticalDistance) < 4;
    const isVerticalTouchScroll =
      start.isTouch && Math.abs(verticalDistance) >= Math.abs(horizontalDistance);
    if (!start.hasMoved && (belowDragThreshold || isVerticalTouchScroll)) return;
    start.hasMoved = true;
    ignoreClick.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const sensitivity =
      180 / Math.max(200, event.currentTarget.getBoundingClientRect().width) / view.zoom;
    setView((current) => ({
      ...current,
      rotation: [
        (start.rotation[0] + horizontalDistance * sensitivity) % 360,
        Math.max(
          -85,
          Math.min(85, start.rotation[1] - (start.isTouch ? 0 : verticalDistance) * sensitivity),
        ),
      ],
    }));
  };
  const endDrag = (event: PointerEvent<SVGSVGElement>): void => {
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const openStreet = (): void => {
    if (!selectedCoordinates) return;
    setPaused(true);
    setDetails({ center: selectedCoordinates, zoom: 16 });
  };
  const returnToGlobe = (coordinates: Coordinates): void => {
    setView((current) => ({ ...current, rotation: globeRotation(coordinates), zoom: 1.6 }));
    setPaused(true);
    setDetails(null);
  };
  const cancelDrag = (): void => {
    drag.current = null;
    setDragging(false);
  };
  return {
    drawing,
    ignoreClick,
    view,
    paused,
    reducedMotion,
    details,
    canOpenStreet: Boolean(selectedCoordinates),
    rotate,
    zoom,
    reset,
    pause: () => setPaused(true),
    togglePaused: () => setPaused((value) => !value),
    openStreet,
    returnToGlobe,
    handleKey,
    handlePointerDown,
    handlePointerMove,
    endDrag,
    cancelDrag,
  };
}
