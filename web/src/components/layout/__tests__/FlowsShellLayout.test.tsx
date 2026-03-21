import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FlowsShellLayout } from '../FlowsShellLayout';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'jon@example.com' },
    profile: null,
    signOut: vi.fn(),
  }),
}));

afterEach(cleanup);

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/app/flows/default/demo-flow/overview']}>
      <Routes>
        <Route path="/app/flows/:namespace/:flowId/:tab" element={<FlowsShellLayout />}>
          <Route index element={<div data-testid="flows-detail-child">detail</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('FlowsShellLayout', () => {
  it('renders the flows detail rail and main area', () => {
    renderWithRouter();

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Flows' })).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
  });

  it('renders the selected flow outlet inside the flows workspace frame', () => {
    renderWithRouter();

    expect(screen.getByTestId('flows-shell-frame')).toBeInTheDocument();
    expect(screen.getByTestId('flows-detail-child')).toBeInTheDocument();
  });
});
