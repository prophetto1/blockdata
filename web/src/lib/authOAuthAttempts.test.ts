import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

describe('authOAuthAttempts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    sessionStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllEnvs();
  });

  it('posts the anonymous OAuth attempt creation payload to platform-api', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          attempt_id: 'attempt-1',
          attempt_secret: 'secret-1',
          expires_at: '2026-03-21T20:30:00+00:00',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { createOAuthAttempt } = await import('./authOAuthAttempts');

    const result = await createOAuthAttempt({
      provider: 'google',
      redirectOrigin: 'http://localhost:5374',
      nextPath: '/app',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/platform-api/auth/oauth/attempts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          provider: 'google',
          redirect_origin: 'http://localhost:5374',
          next_path: '/app',
        }),
      }),
    );
    expect(result).toEqual({
      attemptId: 'attempt-1',
      attemptSecret: 'secret-1',
      expiresAt: '2026-03-21T20:30:00+00:00',
    });
  });

  it('posts OAuth attempt event payloads with the attempt secret', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, status: 'completed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { recordOAuthAttemptEvent } = await import('./authOAuthAttempts');

    const result = await recordOAuthAttemptEvent({
      attemptId: 'attempt-1',
      attemptSecret: 'secret-1',
      event: 'completed',
      result: 'welcome',
      profileState: 'missing',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/platform-api/auth/oauth/attempts/attempt-1/events',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          attempt_secret: 'secret-1',
          event: 'completed',
          result: 'welcome',
          profile_state: 'missing',
        }),
      }),
    );
    expect(result).toEqual({ ok: true, status: 'completed' });
  });

  it('records a stored failure event and clears sessionStorage', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, status: 'failed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const {
      finalizeStoredOAuthAttemptFailure,
      readStoredOAuthAttempt,
      storeOAuthAttempt,
    } = await import('./authOAuthAttempts');

    storeOAuthAttempt({ attemptId: 'attempt-1', attemptSecret: 'secret-1' });

    await finalizeStoredOAuthAttemptFailure({
      failureCategory: 'unexpected',
      result: 'login_error',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/platform-api/auth/oauth/attempts/attempt-1/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          attempt_secret: 'secret-1',
          event: 'failed',
          result: 'login_error',
          failure_category: 'unexpected',
        }),
      }),
    );
    expect(readStoredOAuthAttempt()).toBeNull();
  });
});
