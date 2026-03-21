import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { ScalarApiPlayground } from './ScalarApiPlayground';
import {
  SCALAR_THEME_SYNC_EVENT,
  SHELL_TOKEN_KEYS,
  type ScalarThemeMode,
  type ScalarThemeSyncMessage,
} from '@/scalar-host/theme-contract';

const UI_THEME_KEY = 'ui-theme';

function resolveShellThemeMode(): ScalarThemeMode {
  if (typeof document === 'undefined') {
    return 'dark';
  }

  const attributeMode = document.documentElement.getAttribute('data-theme');
  if (attributeMode === 'light' || attributeMode === 'dark') {
    return attributeMode;
  }

  if (typeof window !== 'undefined') {
    try {
      const storedMode = window.localStorage.getItem(UI_THEME_KEY);
      if (storedMode === 'light' || storedMode === 'dark') {
        return storedMode;
      }
    } catch {
      // Ignore private mode storage errors.
    }
  }

  return 'dark';
}

function readShellTokens(): ScalarThemeSyncMessage['tokens'] {
  if (typeof document === 'undefined') {
    return {};
  }

  const styles = window.getComputedStyle(document.documentElement);
  const tokens: ScalarThemeSyncMessage['tokens'] = {};

  SHELL_TOKEN_KEYS.forEach((token) => {
    const value = styles.getPropertyValue(token).trim();
    if (value) {
      tokens[token] = value;
    }
  });

  return tokens;
}

export function ScalarApiPlaygroundPage() {
  useShellHeaderTitle({});
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastMessageSignature = useRef<string>('');
  const location = useLocation();

  const scalarQueryConfig = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      specUrl: params.get('scalarUrl') ?? undefined,
      proxyUrl: params.get('scalarProxyUrl') ?? undefined,
    };
  }, [location.search]);

  const syncThemeToIframe = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) {
      return;
    }

    const message: ScalarThemeSyncMessage = {
      type: SCALAR_THEME_SYNC_EVENT,
      mode: resolveShellThemeMode(),
      tokens: readShellTokens(),
    };

    const signature = JSON.stringify([
      message.mode,
      ...SHELL_TOKEN_KEYS.map((token) => message.tokens[token] ?? ''),
    ]);

    if (signature === lastMessageSignature.current) {
      return;
    }

    lastMessageSignature.current = signature;
    iframeWindow.postMessage(message, window.location.origin);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    let rafId = 0;
    const scheduleSync = () => {
      if (rafId) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        syncThemeToIframe();
      });
    };

    const rootObserver = new MutationObserver(() => scheduleSync());
    rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style', 'class'],
    });

    const headObserver = new MutationObserver(() => scheduleSync());
    if (document.head) {
      headObserver.observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    window.addEventListener('focus', scheduleSync);
    document.addEventListener('visibilitychange', scheduleSync);

    scheduleSync();

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      rootObserver.disconnect();
      headObserver.disconnect();
      window.removeEventListener('focus', scheduleSync);
      document.removeEventListener('visibilitychange', scheduleSync);
    };
  }, [syncThemeToIframe]);

  return (
    <div className="h-[calc(100vh-var(--app-shell-header-height))] min-h-0 overflow-hidden">
      <ScalarApiPlayground
        specUrl={scalarQueryConfig.specUrl}
        proxyUrl={scalarQueryConfig.proxyUrl}
        iframeRef={iframeRef}
        onIframeLoad={syncThemeToIframe}
      />
    </div>
  );
}
