import { useEffect, useState } from 'react';

import type { SiteContent } from '../lib/content';

/** Keep the validated fallback visible until the public CMS supplies newer content. */
export function usePublishedContent(initialContent: SiteContent, enabled: boolean): SiteContent {
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let unsubscribe: (() => void) | undefined;

    async function subscribe(): Promise<void> {
      try {
        const { getCms } = await import('../lib/cms');
        if (disposed) return;

        unsubscribe = getCms()?.subscribeContent(
          (snapshot) => {
            if (snapshot) setContent(snapshot.content);
          },
          () => console.warn('Published content unavailable; retaining the last validated page.'),
        );
      } catch {
        console.warn('Content service unavailable; showing the saved page.');
      }
    }

    void subscribe();
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [enabled]);

  return content;
}
