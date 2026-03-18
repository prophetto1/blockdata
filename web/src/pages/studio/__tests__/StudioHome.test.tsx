import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import StudioHome from '../StudioHome';

afterEach(cleanup);

function renderHome() {
  return render(<MemoryRouter><StudioHome /></MemoryRouter>);
}

describe('StudioHome', () => {
  it('renders a Data Studio heading', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: /data studio/i })).toBeInTheDocument();
  });

  it('renders a card for each section', () => {
    renderHome();
    for (const label of ['SQL', 'PYTHON', 'VISUAL', 'TABLES', 'RUNS', 'JOBS']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders correct href for each card', () => {
    renderHome();
    expect(screen.getByRole('link', { name: /^sql$/i })).toHaveAttribute('href', '/app/studio/sql');
    expect(screen.getByRole('link', { name: /^python$/i })).toHaveAttribute('href', '/app/studio/python');
    expect(screen.getByRole('link', { name: /^visual$/i })).toHaveAttribute('href', '/app/studio/visual');
    expect(screen.getByRole('link', { name: /^tables$/i })).toHaveAttribute('href', '/app/studio/data');
    expect(screen.getByRole('link', { name: /^runs$/i })).toHaveAttribute('href', '/app/studio/runs');
    expect(screen.getByRole('link', { name: /^jobs$/i })).toHaveAttribute('href', '/app/studio/jobs');
  });

  it('renders a description for the SQL card', () => {
    renderHome();
    expect(screen.getByText(/write sql transforms/i)).toBeInTheDocument();
  });
});
