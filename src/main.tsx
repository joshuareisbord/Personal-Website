import { createRoot, hydrateRoot } from 'react-dom/client';

import { App } from './website';
import { initialContent } from './data/content';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Page root is missing.');
const year = Number(root.dataset['year']) || new Date().getFullYear();
const page = <App pathname={window.location.pathname} content={initialContent} year={year} />;
if (root.dataset['prerendered'] === 'true') {
  hydrateRoot(root, page);
} else {
  createRoot(root).render(page);
}
