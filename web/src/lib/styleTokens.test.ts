import { describe, expect, it } from 'vitest';
import { styleTokens } from './styleTokens';

describe('styleTokens.shell', () => {
  it('uses updated side rail widths', () => {
    expect(styleTokens.shell.navbarWidth).toBe(280);
    expect(styleTokens.shell.navbarCompactWidth).toBe(60);
  });
});
