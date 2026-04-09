import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, it, expect } from 'vitest';
import {
  AdminLeftNav,
  AGCHAIN_ADMIN_NAV_SECTIONS,
  BLOCKDATA_ADMIN_NAV_SECTIONS,
  SUPERUSER_NAV_SECTIONS,
  getSecondaryNav,
} from '../AdminLeftNav';

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

  it('renders no secondary links on the blockdata admin index page', () => {
    renderNav('/app/blockdata-admin');
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('renders instance section anchors and defaults to the first hash target', () => {
    renderNav('/app/blockdata-admin/instance-config');

    expect(screen.getByRole('link', { name: /jobs/i })).toHaveAttribute('href', '/app/blockdata-admin/instance-config#jobs');
    expect(screen.getByRole('link', { name: /workers/i })).toHaveAttribute('href', '/app/blockdata-admin/instance-config#workers');
    expect(screen.getByRole('link', { name: /jobs/i })).toHaveAttribute('aria-current', 'page');
  });

  it('uses the hash to mark the active instance subsection', () => {
    renderNav('/app/blockdata-admin/instance-config#workers');
    expect(screen.getByRole('link', { name: /workers/i })).toHaveAttribute('aria-current', 'page');
  });

  it('getSecondaryNav returns sections for routes with secondary nav', () => {
    expect(getSecondaryNav('/app/blockdata-admin/instance-config').length).toBeGreaterThan(0);
    expect(getSecondaryNav('/app/blockdata-admin/worker-config').length).toBeGreaterThan(0);
  });

  it('getSecondaryNav returns empty array for routes without secondary nav', () => {
    expect(getSecondaryNav('/app/blockdata-admin')).toHaveLength(0);
    expect(getSecondaryNav('/app/blockdata-admin/audit')).toHaveLength(0);
    expect(getSecondaryNav('/app/superuser/operational-readiness')).toHaveLength(0);
    expect(getSecondaryNav('/app/blockdata-admin/ai-providers')).toHaveLength(0);
    expect(getSecondaryNav('/app/blockdata-admin/parsers-docling')).toHaveLength(0);
  });

  it('moves CONFIG OPERATIONS and SYSTEM into Blockdata Admin', () => {
    expect(BLOCKDATA_ADMIN_NAV_SECTIONS.map((section) => section.label)).toEqual(['CONFIG', 'OPERATIONS', 'SYSTEM']);
    expect(BLOCKDATA_ADMIN_NAV_SECTIONS.flatMap((section) => section.items).map((item) => item.path)).toContain('/app/blockdata-admin/instance-config');
    expect(BLOCKDATA_ADMIN_NAV_SECTIONS.flatMap((section) => section.items).map((item) => item.path)).toContain('/app/blockdata-admin/test-integrations');
  });

  it('keeps DEV ONLY inside Superuser', () => {
    const devOnlySection = SUPERUSER_NAV_SECTIONS.find((section) => section.label === 'DEV ONLY');
    const operationalReadiness = SUPERUSER_NAV_SECTIONS
      .flatMap((section) => section.items)
      .find((item) => item.path === '/app/superuser/operational-readiness');
    const coordinationRuntime = SUPERUSER_NAV_SECTIONS
      .flatMap((section) => section.items)
      .find((item) => item.path === '/app/superuser/coordination-runtime');
    const layoutCaptures = devOnlySection?.items.find(
      (item) => item.path === '/app/superuser/design-layout-captures',
    );

    expect(devOnlySection).toBeDefined();
    expect(layoutCaptures).toMatchObject({
      label: 'Layout Captures',
      path: '/app/superuser/design-layout-captures',
    });
    expect(operationalReadiness).toMatchObject({
      label: 'Operational Readiness',
      path: '/app/superuser/operational-readiness',
    });
    expect(coordinationRuntime).toMatchObject({
      label: 'Coordination Runtime',
      path: '/app/superuser/coordination-runtime',
    });
    expect(devOnlySection?.items.map((item) => item.path)).toContain('/app/superuser/operational-readiness');
    expect(devOnlySection?.items.map((item) => item.path)).toContain('/app/superuser/coordination-runtime');
  });

  it('boots AGChain Admin with Models and Tools menu items', () => {
    expect(AGCHAIN_ADMIN_NAV_SECTIONS).toHaveLength(1);
    expect(AGCHAIN_ADMIN_NAV_SECTIONS[0]?.items).toEqual([
      expect.objectContaining({
        label: 'Models',
        path: '/app/agchain-admin/models',
      }),
      expect.objectContaining({
        label: 'Tools',
        path: '/app/agchain-admin/tools',
      }),
    ]);
  });
});
