import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, it, expect } from 'vitest';
import { AdminLeftNav, NAV_SECTIONS, getSecondaryNav } from '../AdminLeftNav';

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

  it('getSecondaryNav returns sections for routes with secondary nav', () => {
    expect(getSecondaryNav('/app/superuser/instance-config').length).toBeGreaterThan(0);
    expect(getSecondaryNav('/app/superuser/worker-config').length).toBeGreaterThan(0);
  });

  it('getSecondaryNav returns empty array for routes without secondary nav', () => {
    expect(getSecondaryNav('/app/superuser')).toHaveLength(0);
    expect(getSecondaryNav('/app/superuser/audit')).toHaveLength(0);
    expect(getSecondaryNav('/app/superuser/operational-readiness')).toHaveLength(0);
    expect(getSecondaryNav('/app/superuser/ai-providers')).toHaveLength(0);
    expect(getSecondaryNav('/app/superuser/parsers-docling')).toHaveLength(0);
  });

  it('exports the operational status entry for the primary admin rail', () => {
    const operationalStatus = NAV_SECTIONS
      .flatMap((section) => section.items)
      .find((item) => item.path === '/app/superuser/operational-readiness');

    expect(operationalStatus).toMatchObject({
      label: 'Operational Status',
      path: '/app/superuser/operational-readiness',
    });
  });
});
