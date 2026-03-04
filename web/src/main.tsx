import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import App from './App';

const UI_THEME_KEY = 'ui-theme';

function initializeTheme() {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme');
  if (current === 'light' || current === 'dark') return;

  const stored = window.localStorage.getItem(UI_THEME_KEY);
  if (stored === 'light' || stored === 'dark') {
    root.setAttribute('data-theme', stored);
    return;
  }

  // Preserve existing dark-default behavior when no prior preference exists.
  root.setAttribute('data-theme', 'dark');
}

initializeTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
