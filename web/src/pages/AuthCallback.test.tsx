import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthCallback from './AuthCallback';

const getSessionMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

describe('AuthCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getSessionMock.mockReset();
    navigateMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('redirects valid callback sessions to /app', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });

    render(<AuthCallback />);

    await vi.advanceTimersByTimeAsync(150);
    await Promise.resolve();

    expect(navigateMock).toHaveBeenCalledWith('/app', { replace: true });
  });

  it('redirects missing callback sessions back to /login', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(<AuthCallback />);

    await vi.advanceTimersByTimeAsync(150);
    await Promise.resolve();

    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
  });
});
