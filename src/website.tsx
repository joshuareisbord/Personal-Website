import { useEffect, type ReactElement } from 'react';

import { Layout } from './layouts/main';
import type { SiteContent } from './lib/content';
import { Home } from './pages/home';
import { OwnerAccess } from './components/owner-access';
import { LinkArrow } from './components/link-arrow';
import { usePublishedContent } from './hooks/use-published-content';

interface AppProps {
  pathname: string;
  content: SiteContent;
  year: number;
}

/** Select the two public pages without introducing a client router. */
export function App({ pathname, content: initial, year }: AppProps): ReactElement {
  const isHome = pathname === '/' || pathname === '/index.html';
  const content = usePublishedContent(initial, isHome);
  useEffect(() => {
    if (isHome) document.title = content.profile.name;
  }, [content.profile.name, isHome]);
  if (isHome) {
    return (
      <Home content={content} year={year} ownerControls={<OwnerAccess fallback={initial} />} />
    );
  }
  return (
    <Layout year={year}>
      <section className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-6xl font-semibold tracking-tight">Page not found</h1>
        <a
          href="/"
          className="inline-flex items-center gap-2 border-b border-ink px-6 py-3 font-mono text-sm"
        >
          Return home <LinkArrow />
        </a>
      </section>
    </Layout>
  );
}
