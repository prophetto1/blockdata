import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const signUpMock = vi.fn();
const resendMock = vi.fn();
const signOutMock = vi.fn();
const unsubscribeMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
      signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
      signUp: (...args: unknown[]) => signUpMock(...args),
      resend: (...args: unknown[]) => resendMock(...args),
      signOut: (...args: unknown[]) => signOutMock(...args),
    },
    from: vi.fn(),
  },
}));

async function renderAuthProvider() {
  const mod = await import('./AuthContext');
  const { AuthProvider, useAuth } = mod;

  function Consumer() {
    const auth = useAuth();
    return (
      <div data-testid="auth-state">
        {auth.loading ? 'loading' : auth.session ? 'signed-in' : 'signed-out'}
      </div>
    );
  }

  render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    cleanup();

    getSessionMock.mockReset();
    onAuthStateChangeMock.mockReset();
    signInWithPasswordMock.mockReset();
    signUpMock.mockReset();
    resendMock.mockReset();
    signOutMock.mockReset();
    unsubscribeMock.mockReset();

    onAuthStateChangeMock.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    });
    getSessionMock.mockResolvedValue({ data: { session: null } });
    signInWithPasswordMock.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('clears loading after the initial session bootstrap completes', async () => {
    vi.stubEnv('VITE_DEV_AUTO_LOGIN_ENABLED', 'false');

    await renderAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('signed-out');
    });
  });

  it('does not attempt dev auto-login unless it is explicitly enabled', async () => {
    vi.stubEnv('VITE_DEV_AUTO_LOGIN_ENABLED', '');

    await renderAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('signed-out');
    });

    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it('attempts dev auto-login when it is explicitly enabled', async () => {
    vi.stubEnv('VITE_DEV_AUTO_LOGIN_ENABLED', 'true');

    await renderAuthProvider();

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalledTimes(1);
    });
  });
});
