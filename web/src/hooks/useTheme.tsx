import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const UI_THEME_KEY = 'ui-theme';
export type ThemeChoice = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  /** The user's persisted preference (light | dark | system). */
  choice: ThemeChoice;
  /** The resolved boolean — true when the active appearance is dark. */
  isDark: boolean;
  /** Set an explicit preference. */
  setTheme: (next: ThemeChoice) => void;
  /** Shortcut: flip between light and dark (resets "system" to an explicit value). */
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredChoice(): ThemeChoice {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(UI_THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'system';
}

function resolveAppearance(choice: ThemeChoice): 'light' | 'dark' {
  if (choice === 'light' || choice === 'dark') return choice;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function applyToDocument(appearance: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', appearance);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readStoredChoice);
  const appearance = useMemo(() => resolveAppearance(choice), [choice]);
  const isDark = appearance === 'dark';

  // Apply on mount and when choice changes.
  useEffect(() => {
    applyToDocument(appearance);
  }, [appearance]);

  // Listen for OS preference changes when set to "system".
  useEffect(() => {
    if (choice !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyToDocument(resolveAppearance('system'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [choice]);

  const setTheme = useCallback((next: ThemeChoice) => {
    if (next === 'system') {
      window.localStorage.removeItem(UI_THEME_KEY);
    } else {
      window.localStorage.setItem(UI_THEME_KEY, next);
    }
    setChoiceState(next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ choice, isDark, setTheme, toggle }),
    [choice, isDark, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
