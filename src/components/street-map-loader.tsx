import { useEffect, useState, type ComponentType, type ReactElement } from 'react';

import type { StreetMapProps } from './street-map';

/** Load street mapping only after a visitor zooms beyond the globe. */
export function StreetMapLoader(props: StreetMapProps): ReactElement {
  const [Component, setComponent] = useState<ComponentType<StreetMapProps> | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    void import('./street-map').then((module) => {
      if (active) setComponent(() => module.default);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [attempt]);
  if (Component) return <Component {...props} />;
  return <div className="mt-4">
    <div className="flex aspect-square items-center justify-center border border-rule p-5 text-base" role="status">
      {failed ? 'Street map couldn’t load. Try again or return to the globe.' : 'Loading street map…'}
    </div>
    <div className="mt-4 flex flex-wrap gap-3">
      {failed && <button type="button" className="min-h-12 border border-ink px-4" onClick={() => setAttempt((value) => value + 1)}>Retry street map</button>}
      <button type="button" className="min-h-12 border border-ink px-4" onClick={() => props.onBack(props.initialCenter)}>Back to globe</button>
    </div>
  </div>;
}
