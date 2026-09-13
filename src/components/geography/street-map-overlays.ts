import type { Map as LeafletMap } from 'leaflet';
import type { RefObject } from 'react';

import { nextMarkerIndex, toMapPosition, type MapPosition } from '../../lib/street-map-data';
import type { WorkJourney } from '../../lib/work-journey';
import type { StreetMapProps } from '../street-map';

interface StreetOverlays {
  positionOverlays: () => void;
  select: (recenter: boolean) => void;
}

/** Create role buttons and world-wrapped routes while registering each listener's cleanup. */
export function createStreetOverlays(
  leaflet: typeof import('leaflet'),
  instance: LeafletMap,
  journey: WorkJourney,
  routes: MapPosition[][],
  latest: RefObject<Pick<StreetMapProps, 'selected' | 'onSelect'>>,
  disposers: (() => void)[],
): StreetOverlays {
  const markers = journey.markers.map((marker) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'street-map-marker-button';
    button.textContent = marker.stops.length > 1 ? String(marker.stops.length) : '•';
    button.setAttribute(
      'aria-label',
      `${marker.stops.map((stop) => `${stop.role.title} at ${stop.role.company}`).join('; ')}. ${marker.stops.length > 1 ? 'Select next role at this city.' : 'Select city.'}`,
    );
    const activate = (event: MouseEvent): void => {
      event.stopPropagation();
      const index = nextMarkerIndex(marker, latest.current.selected);
      if (index !== undefined) latest.current.onSelect(index);
    };
    button.addEventListener('click', activate);
    leaflet.DomEvent.disableClickPropagation(button);
    const point = leaflet
      .marker(toMapPosition(marker.coordinates, instance.getCenter().lng), {
        icon: leaflet.divIcon({
          html: button,
          className: 'street-map-marker',
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        }),
        keyboard: false,
        interactive: false,
      })
      .addTo(instance);
    disposers.push(() => {
      button.removeEventListener('click', activate);
      leaflet.DomEvent.off(button);
    });
    return { marker, point, button };
  });

  const lines = routes.flatMap((route) =>
    [-360, 0, 360].map((copy) => ({
      route,
      copy,
      line: leaflet
        .polyline(route, {
          color: 'var(--color-ink)',
          weight: 2,
          opacity: 0.8,
          dashArray: '4 7',
          interactive: false,
          className: 'street-map-route',
        })
        .addTo(instance),
    })),
  );
  const positionOverlays = (): void => {
    const longitude = instance.getCenter().lng;
    markers.forEach(({ marker, point }) =>
      point.setLatLng(toMapPosition(marker.coordinates, longitude)),
    );
    lines.forEach(({ route, copy, line }) => {
      const midpoint = route[Math.floor(route.length / 2)]![1];
      const offset = 360 * Math.round((longitude - midpoint) / 360) + copy;
      line.setLatLngs(route.map(([lat, lng]): MapPosition => [lat, lng + offset]));
    });
  };
  const select = (recenter: boolean): void => {
    markers.forEach(({ marker, button, point }) => {
      const active = marker.stops.some((stop) => stop.index === latest.current.selected);
      button.setAttribute('aria-pressed', String(active));
      point.setZIndexOffset(active ? 1000 : 0);
    });
    const coordinates = journey.stops.find(
      (stop) => stop.index === latest.current.selected,
    )?.coordinates;
    if (recenter && coordinates)
      instance.setView(toMapPosition(coordinates, instance.getCenter().lng), instance.getZoom(), {
        animate: false,
      });
  };
  return { positionOverlays, select };
}
