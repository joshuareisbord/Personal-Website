import { Component, lazy, Suspense, useState, type ReactElement, type ReactNode } from 'react';

import type { SiteContent } from '../lib/content';

const OwnerPanel = lazy(() => import('./owner-panel'));

interface EditorBoundaryProps {
  children: ReactNode;
  onClose: () => void;
}

interface EditorBoundaryState {
  failed: boolean;
}

interface OwnerAccessProps {
  fallback: SiteContent;
}

class EditorBoundary extends Component<EditorBoundaryProps, EditorBoundaryState> {
  state = { failed: false };
  static getDerivedStateFromError(): EditorBoundaryState {
    return { failed: true };
  }
  render(): ReactNode {
    if (this.state.failed)
      return (
        <div role="alert">
          <p>The editor could not load. Check your connection and reload the page to try again.</p>
          <button type="button" className="min-h-11 px-3 underline" onClick={this.props.onClose}>
            Dismiss
          </button>
        </div>
      );
    return this.props.children;
  }
}

/** Keep the owner entry point discreet and load the editor only on demand. */
export function OwnerAccess({ fallback }: OwnerAccessProps): ReactElement {
  const [open, setOpen] = useState(false);
  const closeEditor = (): void => setOpen(false);
  return (
    <>
      <button
        type="button"
        className="min-h-11 font-mono text-[0.625rem] text-night-muted underline-offset-4 hover:text-white hover:underline"
        onClick={() => setOpen(true)}
      >
        Owners Login
      </button>
      {open && (
        <EditorBoundary onClose={closeEditor}>
          <Suspense fallback={<p role="status">Opening owner login…</p>}>
            <OwnerPanel fallback={fallback} onClose={closeEditor} />
          </Suspense>
        </EditorBoundary>
      )}
    </>
  );
}
