import snapshot from './profile.json';
import { site } from './site';
import { parseContent } from '../lib/content';

/** Repository fallback for prerendering and unavailable database content. */
export const initialContent = parseContent({ profile: snapshot, site });
