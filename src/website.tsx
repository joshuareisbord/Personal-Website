import { useEffect, useState, type ReactElement } from 'react';

import { Layout } from './layouts/main';
import type { SiteContent } from './lib/content';
import { Home } from './pages/home';
import { OwnerAccess } from './components/owner-access';

interface Props { pathname: string; content: SiteContent; year: number; }

/** Select the two public pages without introducing a client router. */
export function App({ pathname, content: initial, year }: Props): ReactElement {
  const [content, setContent] = useState(initial);
  const isHome = ['/', '/home', '/home/', '/home.html'].includes(pathname);
  useEffect(() => {
    if (!isHome) return;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    void import('./lib/cms').then(({ getCms }) => {
      if (disposed) return;
      unsubscribe = getCms()?.subscribeContent((snapshot) => {
        if (snapshot) setContent(snapshot.content);
      }, () => console.warn('Published content unavailable; retaining the last validated page.'));
    }).catch(() => console.warn('Content service unavailable; showing the saved page.'));
    return () => { disposed = true; unsubscribe?.(); };
  }, [isHome]);
  useEffect(() => { if (isHome) document.title = content.profile.name; }, [content.profile.name, isHome]);
  if (['/', '/home', '/home/', '/home.html'].includes(pathname)) {
    return <Home content={content} year={year} ownerControls={<OwnerAccess fallback={initial} />} />;
  }
  return <Layout year={year}>
    <section className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-6xl font-semibold tracking-tight">Page not found</h1>
      <a href="/home" className="border-b border-ink px-6 py-3 font-mono text-sm">Return home ↗</a>
    </section>
  </Layout>;
}
