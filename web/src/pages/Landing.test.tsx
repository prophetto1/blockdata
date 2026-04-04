import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import Landing from './Landing';

let authState = {
  session: null as null | { user: { id: string } },
  loading: false,
};

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => authState,
}));

describe('Landing', () => {
  beforeEach(() => {
    authState = {
      session: null,
      loading: false,
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('redirects authenticated visitors to /app', async () => {
    authState.session = { user: { id: 'user-1' } };

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<div>App Home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('App Home')).toBeInTheDocument();
    });
  });
});
