import { createApiClientApp } from '@scalar/api-client/layouts/App';
import '@scalar/api-client/style.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import {
  SCALAR_THEME_SYNC_EVENT,
  SHELL_TOKEN_KEYS,
  SHELL_TO_SCALAR_TOKEN_MAP,
  type ScalarThemeMode,
  type ScalarThemeSyncMessage,
} from './theme-contract';

type HostConfig = {
  url?: string;
  proxyUrl?: string;
};

type ScalarRouter = {
  beforeEach: (
    guard: (to: { name?: unknown; path: string; params: Record<string, unknown> }) => unknown,
  ) => void;
};

/** Block Scalar's internal Settings route — our shell handles theming. */
function disableSettingsRoute(router: ScalarRouter) {
  router.beforeEach((to) => {
    const name = typeof to.name === 'string' ? to.name : '';
    if (name === 'settings' || name === 'settings.default') {
      const match = to.path.match(/\/workspace\/([^/]+)/);
      const workspace = match?.[1] ? decodeURIComponent(match[1]) : 'default';
      return { name: 'request.root', params: { workspace } };
    }
    return true;
  });
}

/** Remove the Settings link from the SideNav icon rail. */
function pruneSettingsNavLink() {
  const nav = document.querySelector<HTMLElement>('#scalar-client-app nav[aria-label="App Navigation"]');
  if (!nav) return;
  nav.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    if (anchor.getAttribute('href')?.includes('/settings')) {
      anchor.closest('li')?.remove();
    }
  });
}

function installSettingsNavPruner() {
  pruneSettingsNavLink();
  const observer = new MutationObserver(() => pruneSettingsNavLink());
  observer.observe(document.body, { childList: true, subtree: true });
}


function parseHostConfig(): HostConfig {
  const params = new URLSearchParams(window.location.search);

  const url = params.get('url') ?? undefined;
  const proxyUrl = params.get('proxyUrl') ?? undefined;

  return { url, proxyUrl };
}


function isScalarThemeSyncMessage(value: unknown): value is ScalarThemeSyncMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ScalarThemeSyncMessage>;
  return (
    candidate.type === SCALAR_THEME_SYNC_EVENT
    && (candidate.mode === 'dark' || candidate.mode === 'light')
    && !!candidate.tokens
  );
}

function resolveModeFromDocument(doc: Document): ScalarThemeMode {
  return doc.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function readShellTokens(doc: Document): ScalarThemeSyncMessage['tokens'] {
  const view = doc.defaultView;
  if (!view) {
    return {};
  }

  const styles = view.getComputedStyle(doc.documentElement);
  const tokens: ScalarThemeSyncMessage['tokens'] = {};

  SHELL_TOKEN_KEYS.forEach((token) => {
    const value = styles.getPropertyValue(token).trim();
    if (value) {
      tokens[token] = value;
    }
  });

  return tokens;
}

function applyThemeSync(mode: ScalarThemeMode, tokens: ScalarThemeSyncMessage['tokens']) {
  document.body.classList.toggle('dark-mode', mode === 'dark');
  document.body.classList.toggle('light-mode', mode === 'light');
  document.documentElement.style.colorScheme = mode;

  try {
    window.localStorage.setItem('colorMode', mode);
  } catch {
    // Ignore private mode storage errors.
  }

  SHELL_TO_SCALAR_TOKEN_MAP.forEach(([shellToken, scalarToken]) => {
    const value = tokens[shellToken];
    if (value) {
      document.documentElement.style.setProperty(scalarToken, value);
    }
  });

  const radius = tokens['--radius'];
  if (radius) {
    document.documentElement.style.setProperty('--scalar-radius', `calc(${radius} - 4px)`);
    document.documentElement.style.setProperty('--scalar-radius-lg', `calc(${radius} - 2px)`);
    document.documentElement.style.setProperty('--scalar-radius-xl', radius);
  }

  // Keep call-to-action contrast aligned with shell branding when provided.
  const primary = tokens['--primary'];
  if (primary) {
    document.documentElement.style.setProperty('--scalar-button-1-hover', primary);
    document.documentElement.style.setProperty('--scalar-link-color-visited', primary);
  }
}

function applyInitialThemeFromParent() {
  if (window.parent === window) {
    return;
  }

  try {
    const parentDocument = window.parent.document;
    const mode = resolveModeFromDocument(parentDocument);
    const tokens = readShellTokens(parentDocument);
    applyThemeSync(mode, tokens);
  } catch {
    // Cross-origin parent access is ignored.
  }
}

function installThemeSyncBridge() {
  applyInitialThemeFromParent();

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.origin !== window.location.origin) {
      return;
    }

    if (!isScalarThemeSyncMessage(event.data)) {
      return;
    }

    applyThemeSync(event.data.mode, event.data.tokens);
  });
}

async function bootstrap() {
  const target = document.getElementById('scalar-client');
  if (!target) {
    return;
  }

  installThemeSyncBridge();

  const config = parseHostConfig();
  const { client, router } = await createApiClientApp(
    target,
    { ...config, showSidebar: true },
    true,
  );

  disableSettingsRoute(router as ScalarRouter);
  installSettingsNavPruner();

  // Navigate to the first request so the editor is immediately usable.
  const requests = client.store.requests;
  const firstRequestUid = Object.keys(requests)[0];
  if (firstRequestUid) {
    router.push({
      name: 'request',
      params: { workspace: 'default', request: firstRequestUid },
    });
  }
}

void bootstrap();
