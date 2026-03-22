import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthCallback from './AuthCallback';

const getSessionMock = vi.fn();
const fromMock = vi.fn();
const navigateMock = vi.fn();
const recordOAuthAttemptEventMock = vi.fn();
const readStoredOAuthAttemptMock = vi.fn();
const clearStoredOAuthAttemptMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock('@/lib/authOAuthAttempts', () => ({
  clearStoredOAuthAttempt: (...args: unknown[]) => clearStoredOAuthAttemptMock(...args),
  readStoredOAuthAttempt: (...args: unknown[]) => readStoredOAuthAttemptMock(...args),
  recordOAuthAttemptEvent: (...args: unknown[]) => recordOAuthAttemptEventMock(...args),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

describe('AuthCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getSessionMock.mockReset();
    fromMock.mockReset();
    navigateMock.mockReset();
    recordOAuthAttemptEventMock.mockReset();
    readStoredOAuthAttemptMock.mockReset();
    clearStoredOAuthAttemptMock.mockReset();
    recordOAuthAttemptEventMock.mockResolvedValue({ ok: true, status: 'completed' });
    readStoredOAuthAttemptMock.mockReturnValue({ attemptId: 'attempt-1', attemptSecret: 'secret-1' });
    fromMock.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { display_name: null },
            error: null,
          }),
        })),
      })),
    });
    window.history.replaceState({}, '', '/auth/callback');
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('routes first-time OAuth users to /auth/welcome and records attempt events', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });

    render(<AuthCallback />);

    await vi.advanceTimersByTimeAsync(150);
    await Promise.resolve();

    expect(navigateMock).toHaveBeenCalledWith('/auth/welcome', { replace: true });
    expect(recordOAuthAttemptEventMock).toHaveBeenNthCalledWith(1, {
      attemptId: 'attempt-1',
      attemptSecret: 'secret-1',
      event: 'callback_received',
    });
    expect(recordOAuthAttemptEventMock).toHaveBeenNthCalledWith(2, {
      attemptId: 'attempt-1',
      attemptSecret: 'secret-1',
      event: 'session_detected',
    });
    expect(recordOAuthAttemptEventMock).toHaveBeenNthCalledWith(3, {
      attemptId: 'attempt-1',
      attemptSecret: 'secret-1',
      event: 'profile_missing',
      profileState: 'missing',
    });
    expect(recordOAuthAttemptEventMock).toHaveBeenNthCalledWith(4, {
      attemptId: 'attempt-1',
      attemptSecret: 'secret-1',
      event: 'completed',
      result: 'welcome',
      profileState: 'missing',
    });
    expect(clearStoredOAuthAttemptMock).toHaveBeenCalled();
  });

  it('redirects missing callback sessions back to /login', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(<AuthCallback />);

    await vi.advanceTimersByTimeAsync(150);
    await Promise.resolve();

    expect(navigateMock).toHaveBeenCalledWith(
      '/login?auth_error=No%20session%20found.%20Please%20sign%20in%20again.',
      { replace: true },
    );
    expect(recordOAuthAttemptEventMock).toHaveBeenNthCalledWith(1, {
      attemptId: 'attempt-1',
      attemptSecret: 'secret-1',
      event: 'callback_received',
    });
    expect(recordOAuthAttemptEventMock).toHaveBeenNthCalledWith(2, {
      attemptId: 'attempt-1',
      attemptSecret: 'secret-1',
      event: 'failed',
      result: 'login_error',
      failureCategory: 'no_session',
    });
    expect(clearStoredOAuthAttemptMock).toHaveBeenCalled();
  });

  it('routes returning OAuth users to /app when a display name already exists', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });
    fromMock.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { display_name: 'Jon' },
            error: null,
          }),
        })),
      })),
    });

    render(<AuthCallback />);

    await vi.advanceTimersByTimeAsync(150);
    await Promise.resolve();

    expect(navigateMock).toHaveBeenCalledWith('/app', { replace: true });
    expect(recordOAuthAttemptEventMock).toHaveBeenNthCalledWith(3, {
      attemptId: 'attempt-1',
      attemptSecret: 'secret-1',
      event: 'profile_present',
      profileState: 'present',
    });
    expect(recordOAuthAttemptEventMock).toHaveBeenNthCalledWith(4, {
      attemptId: 'attempt-1',
      attemptSecret: 'secret-1',
      event: 'completed',
      result: 'app',
      profileState: 'present',
    });
  });

  it('redirects callback error fragments to /login with a readable message', async () => {
    window.history.replaceState(
      {},
      '',
      '/auth/callback#error=access_denied&error_description=Provider%20disabled',
    );

    render(<AuthCallback />);

    await vi.advanceTimersByTimeAsync(150);
    await Promise.resolve();

    expect(navigateMock).toHaveBeenCalledWith('/login?auth_error=Provider%20disabled', {
      replace: true,
    });
    expect(recordOAuthAttemptEventMock).toHaveBeenNthCalledWith(1, {
      attemptId: 'attempt-1',
      attemptSecret: 'secret-1',
      event: 'callback_received',
    });
    expect(recordOAuthAttemptEventMock).toHaveBeenNthCalledWith(2, {
      attemptId: 'attempt-1',
      attemptSecret: 'secret-1',
      event: 'failed',
      result: 'login_error',
      failureCategory: 'callback_error',
      callbackErrorCode: 'access_denied',
    });
    expect(clearStoredOAuthAttemptMock).toHaveBeenCalled();
  });
});
