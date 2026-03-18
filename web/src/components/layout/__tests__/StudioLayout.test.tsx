import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StudioLayout } from '../StudioLayout';

afterEach(cleanup);

vi.mock('@/components/studio/StudioLeftNav', () => ({
  StudioLeftNav: () => <nav aria-label="Studio navigation" />,
}));

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/app/studio']}>
      <Routes>
        <Route path="/app/studio" element={<StudioLayout />}>
          <Route index element={<div data-testid="outlet-child">outlet</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('StudioLayout', () => {
  it('renders a navigation element', () => {
    renderLayout();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders a main element', () => {
    renderLayout();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders the outlet child inside main', () => {
    renderLayout();
    expect(screen.getByTestId('outlet-child')).toBeInTheDocument();
  });

  it('applies dark background color', () => {
    const { container } = renderLayout();
    const shell = container.firstChild as HTMLElement;
    expect(shell.style.backgroundColor).toBe('rgb(9, 9, 11)');
  });
});
