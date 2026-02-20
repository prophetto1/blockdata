import { themeQuartz } from 'ag-grid-community';
import { styleTokens } from '@/lib/styleTokens';

export function createAppGridTheme(isDark: boolean) {
  const grid = isDark ? styleTokens.grid.dark : styleTokens.grid.light;
  return themeQuartz.withParams({
    rowVerticalPaddingScale: 0.6,
    browserColorScheme: isDark ? 'dark' : 'light',
    backgroundColor: grid.background,
    chromeBackgroundColor: grid.chromeBackground,
    foregroundColor: grid.foreground,
    borderColor: grid.border,
    subtleTextColor: grid.subtleText,
  });
}
