import { renderToString } from 'react-dom/server';

import { App } from './website';
import { initialContent } from './data/content';

/** Render HTML during builds; this module is never deployed as an application server. */
export function renderPage(pathname: string, year: number): { html: string; title: string } {
  return {
    html: renderToString(<App pathname={pathname} content={initialContent} year={year} />),
    title: pathname === '/home' ? initialContent.profile.name : `Page not found — ${initialContent.profile.name}`,
  };
}
