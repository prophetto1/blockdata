import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('authRedirects', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses VITE_AUTH_REDIRECT_ORIGIN when it is configured', async () => {
    vi.stubEnv('VITE_AUTH_REDIRECT_ORIGIN', 'https://app.example.com/');

    const { getAuthRedirectUrl } = await import('./authRedirects');

    expect(getAuthRedirectUrl('/auth/callback')).toBe('https://app.example.com/auth/callback');
  });

  it('falls back to the current browser origin when no override is configured', async () => {
    const { getAuthRedirectUrl } = await import('./authRedirects');

    expect(getAuthRedirectUrl('/auth/callback')).toBe(`${window.location.origin}/auth/callback`);
  });
});
