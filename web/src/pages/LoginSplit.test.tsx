import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import LoginSplit from './LoginSplit';

let authState = {
  session: null as null | { user: { id: string } },
  loading: false,
  signIn: vi.fn(),
  resendSignupConfirmation: vi.fn(),
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
});
