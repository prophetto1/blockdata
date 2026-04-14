import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import App from './App';
import { queryClient } from './lib/queryClient';

const UI_THEME_KEY = 'ui-theme';
const UI_SHELL_FONT_KEY = 'ui-shell-font';
const SHELL_FONT_SEARCH_PARAM = 'shell-font';
type ShellFontChoice = 'inter' | 'ibm-plex-sans' | 'dm-sans' | 'plus-jakarta-sans';

const ALLOWED_SHELL_FONTS: readonly ShellFontChoice[] = [
  'inter',
  'ibm-plex-sans',
  'dm-sans',
  'plus-jakarta-sans',
];

function isShellFontChoice(value: string | null): value is ShellFontChoice {
  return value !== null && ALLOWED_SHELL_FONTS.includes(value as ShellFontChoice);
}

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

function initializeShellFont() {
  const root = document.documentElement;
  const current = root.getAttribute('data-shell-font');
  if (isShellFontChoice(current)) {
    return;
  }

  const requested = new URLSearchParams(window.location.search).get(SHELL_FONT_SEARCH_PARAM);
  if (isShellFontChoice(requested)) {
    root.setAttribute('data-shell-font', requested);
    window.localStorage.setItem(UI_SHELL_FONT_KEY, requested);
    return;
  }

  const stored = window.localStorage.getItem(UI_SHELL_FONT_KEY);
  if (isShellFontChoice(stored)) {
    root.setAttribute('data-shell-font', stored);
    return;
  }

  root.setAttribute('data-shell-font', 'inter');
}

initializeTheme();
initializeShellFont();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
