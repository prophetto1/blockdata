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
  it('renders a nav with the secondary rail label', () => {
    renderNav();
    expect(screen.getByRole('navigation', { name: /admin secondary navigation/i })).toBeInTheDocument();
  });

  it('renders no secondary links on the admin index page', () => {
    renderNav('/app/superuser');
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('renders instance section anchors and defaults to the first hash target', () => {
    renderNav('/app/superuser/instance-config');

    expect(screen.getByRole('link', { name: /jobs/i })).toHaveAttribute('href', '/app/superuser/instance-config#jobs');
    expect(screen.getByRole('link', { name: /workers/i })).toHaveAttribute('href', '/app/superuser/instance-config#workers');
    expect(screen.getByRole('link', { name: /jobs/i })).toHaveAttribute('aria-current', 'page');
  });

  it('uses the hash to mark the active instance subsection', () => {
    renderNav('/app/superuser/instance-config#workers');
    expect(screen.getByRole('link', { name: /workers/i })).toHaveAttribute('aria-current', 'page');
  });

  it('renders docling secondary links for docling pages', () => {
    renderNav('/app/superuser/parsers-docling');

    expect(screen.getByRole('link', { name: /profiles/i })).toHaveAttribute('href', '/app/superuser/parsers-docling');
    expect(screen.getByRole('link', { name: /block types/i })).toHaveAttribute('href', '/app/superuser/document-views');
    expect(screen.getByRole('link', { name: /profiles/i })).toHaveAttribute('aria-current', 'page');
  });
});
