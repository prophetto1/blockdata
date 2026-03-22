import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import LoginSplit from './LoginSplit';

let authState = {
  session: null as null | { user: { id: string } },
  loading: false,
  signIn: vi.fn(),
  resendSignupConfirmation: vi.fn(),
  signInWithOAuth: vi.fn(),
};

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => authState,
}));

describe('LoginSplit', () => {
  beforeEach(() => {
    authState = {
      session: null,
      loading: false,
      signIn: vi.fn().mockResolvedValue(undefined),
      resendSignupConfirmation: vi.fn().mockResolvedValue(undefined),
      signInWithOAuth: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('redirects authenticated visitors away from the login page', async () => {
    authState.session = { user: { id: 'user-1' } };

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginSplit />} />
          <Route path="/app" element={<div>App Home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('App Home')).toBeInTheDocument();
    });
  });

  it('navigates to /app after a successful manual sign-in', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginSplit />} />
          <Route path="/app" element={<div>App Home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'dev@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'SecretPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(authState.signIn).toHaveBeenCalledWith('dev@example.com', 'SecretPass123!');
      expect(screen.getByText('App Home')).toBeInTheDocument();
    });
  });

  it('renders both social login buttons and calls the selected provider', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginSplit />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue with GitHub' })).toBeInTheDocument();
      expect(authState.signInWithOAuth).toHaveBeenCalledWith('google');
    });
  });

  it('renders callback-propagated auth errors from the URL query string', async () => {
    render(
      <MemoryRouter initialEntries={['/login?auth_error=Provider%20disabled']}>
        <Routes>
          <Route path="/login" element={<LoginSplit />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Provider disabled')).toBeInTheDocument();
    });
  });
});
