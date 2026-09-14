const modulePath = /^\/assets\/[A-Za-z0-9_-]+\.js$/;
const tagPattern = /<([a-z][a-z0-9:-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;

function attributes(text: string): Map<string, string> {
  const values = new Map<string, string>();
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of text.matchAll(pattern)) {
    const key = (match[1] ?? '').toLowerCase();
    if (values.has(key)) throw new Error('Duplicate HTML attribute in public output.');
    const value = (match[2] ?? match[3] ?? match[4] ?? '').replace(/&amp;/g, '&');
    if (/^on[a-z]/i.test(key)) throw new Error('Inline event handler in public output.');
    values.set(key, value);
  }
  return values;
}

function validateReference(value: string, allowHttpsImage = false): string | null {
  if (allowHttpsImage && value.startsWith('https://')) {
    const url = new URL(value);
    if (!url.username && !url.password) return null;
  }
  if (/^data:(?:image\/(?:png|jpeg|webp|gif|svg\+xml)|font\/[^;,]+)[;,]/i.test(value)) return null;
  if (value.startsWith('#')) return null;
  if (
    !value ||
    /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value) ||
    /[\\\s<>]|&(?:#|[a-z]+;)/i.test(value)
  ) {
    throw new Error('Resource must be a local build asset.');
  }
  return value;
}

/** Validate prerendered HTML, returning local asset references for existence checks. */
export function validateStaticHtml(html: string): string[] {
  const references: string[] = [];
  const markup = html.replace(/<!--[\s\S]*?-->/g, '');
  const withoutScripts = markup.replace(
    /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script\s*>/gi,
    (_match: string, rawAttributes: string, body: string) => {
      const attrs = attributes(rawAttributes);
      const src = attrs.get('src') ?? '';
      if (
        attrs.get('type') !== 'module' ||
        !modulePath.test(src) ||
        body.trim() ||
        [...attrs.keys()].some((key) => !['type', 'src', 'crossorigin'].includes(key))
      ) {
        throw new Error('Only local Vite module scripts are allowed in public HTML.');
      }
      references.push(src);
      return '';
    },
  );
  if (/<(?:script|iframe|object|embed|base)\b/i.test(withoutScripts))
    throw new Error('Unexpected executable HTML in public output.');
  for (const match of withoutScripts.matchAll(tagPattern)) {
    const tag = (match[1] ?? '').toLowerCase();
    const attrs = attributes(match[2] ?? '');
    for (const [key, value] of attrs) {
      if (
        ['src', 'href', 'action', 'formaction'].includes(key) &&
        /^\s*(?:javascript|vbscript|data):/i.test(value) &&
        !(key === 'src' && tag === 'img')
      ) {
        throw new Error('Unexpected backend or executable reference in public HTML.');
      }
    }
    const add = (value: string, allowHttpsImage = false): void => {
      const local = validateReference(value, allowHttpsImage);
      if (local) references.push(local);
    };
    if (tag === 'img' || tag === 'source') {
      if (attrs.has('src')) add(attrs.get('src') ?? '', true);
      if (attrs.has('srcset')) {
        const srcset = attrs.get('srcset') ?? '';
        if (/data:/i.test(srcset))
          throw new Error('Inline srcset is not supported by output verification.');
        for (const candidate of srcset.split(','))
          add(candidate.trim().split(/\s+/)[0] ?? '', true);
      }
    }
    if (
      tag === 'link' &&
      /(?:^|\s)(?:stylesheet|modulepreload|preload|icon)(?:\s|$)/i.test(attrs.get('rel') ?? '')
    )
      add(attrs.get('href') ?? '');
    if (attrs.has('style')) references.push(...validateStaticCss(attrs.get('style') ?? ''));
  }
  for (const match of withoutScripts.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi))
    references.push(...validateStaticCss(match[1] ?? ''));
  return [...new Set(references)];
}

/** Validate CSS asset URLs while leaving technology names in text unrestricted. */
export function validateStaticCss(css: string): string[] {
  const references: string[] = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of clean.matchAll(
    /(?:url\(\s*|@import\s+)(?:"([^"]*)"|'([^']*)'|([^\s"')]+))/gi,
  )) {
    const value = match[1] ?? match[2] ?? match[3] ?? '';
    const local = validateReference(value);
    if (local) references.push(local);
  }
  return [...new Set(references)];
}
