import { describe, expect, it } from 'vitest';
import { styleTokens } from './styleTokens';

describe('styleTokens.shell', () => {
  it('uses the standard side rail widths', () => {
    expect(styleTokens.shell.navbarWidth).toBe(220);
    expect(styleTokens.shell.navbarCompactWidth).toBe(60);
    expect(styleTokens.shell.navbarMobileWidth).toBe(200);
    expect(styleTokens.shell.navbarMinWidth).toBe(220);
    expect(styleTokens.shell.navbarMaxWidth).toBe(350);
  });
});
