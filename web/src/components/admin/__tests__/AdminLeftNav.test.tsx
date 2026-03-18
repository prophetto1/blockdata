import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, it, expect } from 'vitest';
import { AdminLeftNav } from '../AdminLeftNav';

afterEach(cleanup);

function renderNav(pathname = '/app/superuser') {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AdminLeftNav />
    </MemoryRouter>
  );
}

describe('AdminLeftNav', () => {
  it('renders a nav with admin navigation label', () => {
    renderNav();
    expect(screen.getByRole('navigation', { name: /admin navigation/i })).toBeInTheDocument();
  });

  it('renders links for all admin sections', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /instance/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /workers/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /docling/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /document views/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /audit history/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /api endpoints/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /test integrations/i })).toBeInTheDocument();
  });

  it('renders a back link', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /back to app/i })).toHaveAttribute('href', '/app/assets');
  });

  it('marks active link', () => {
    renderNav('/app/superuser/instance-config');
    expect(screen.getByRole('link', { name: /instance/i })).toHaveAttribute('aria-current', 'page');
  });
});
