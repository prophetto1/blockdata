import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, describe, it, expect } from 'vitest';
import { AdminShellLayout } from '../AdminShellLayout';

afterEach(cleanup);

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/app/superuser']}>
      <Routes>
        <Route path="/app/superuser" element={<AdminShellLayout />}>
          <Route index element={<div data-testid="outlet-child">outlet</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminShellLayout', () => {
  it('renders navigation and main', () => {
    renderWithRouter();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders the outlet child', () => {
    renderWithRouter();
    expect(screen.getByTestId('outlet-child')).toBeInTheDocument();
  });
});
