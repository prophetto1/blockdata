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
    expect(screen.getByRole('navigation', { name: /admin secondary navigation/i })).toBeTruthy();
  });

  it('renders no secondary links on the blockdata admin index page', () => {
    renderNav('/app/blockdata-admin');
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('getSecondaryNav returns empty array for all current admin routes', () => {
    expect(getSecondaryNav('/app/blockdata-admin')).toHaveLength(0);
    expect(getSecondaryNav('/app/blockdata-admin/instance-config')).toHaveLength(0);
    expect(getSecondaryNav('/app/blockdata-admin/worker-config')).toHaveLength(0);
    expect(getSecondaryNav('/app/blockdata-admin/audit')).toHaveLength(0);
    expect(getSecondaryNav('/app/blockdata-admin/parsers-docling')).toHaveLength(0);
    expect(getSecondaryNav('/app/superuser')).toHaveLength(0);
    expect(getSecondaryNav('/app/superuser/operational-readiness')).toHaveLength(0);
    expect(getSecondaryNav('/app/blockdata-admin/ai-providers')).toHaveLength(0);
  });

  it('keeps only the remaining blockdata admin surfaces in the primary rail', () => {
    expect(BLOCKDATA_ADMIN_NAV_SECTIONS.map((section) => section.label)).toEqual(['CONFIG', 'OPERATIONS', 'SYSTEM']);
    const paths = BLOCKDATA_ADMIN_NAV_SECTIONS.flatMap((section) => section.items).map((item) => item.path);
    expect(paths).not.toContain('/app/blockdata-admin/instance-config');
    expect(paths).not.toContain('/app/blockdata-admin/worker-config');
    expect(paths).toContain('/app/blockdata-admin/parsers-docling');
    expect(paths).toContain('/app/blockdata-admin/test-integrations');
  });

  it('groups Superuser navigation into Control Tower, Dev Tools, and Dev Only', () => {
    const sectionLabels = SUPERUSER_NAV_SECTIONS.map((section) => section.label);
    const controlTowerSection = SUPERUSER_NAV_SECTIONS.find((section) => section.label === 'CONTROL TOWER');
    const devToolsSection = SUPERUSER_NAV_SECTIONS.find((section) => section.label === 'DEV TOOLS');
    const devOnlySection = SUPERUSER_NAV_SECTIONS.find((section) => section.label === 'DEV ONLY');

    expect(sectionLabels).toEqual(['CONTROL TOWER', 'DEV TOOLS', 'DEV ONLY']);
    expect(controlTowerSection?.items).toEqual([
      expect.objectContaining({ label: 'Control Tower', path: '/app/superuser' }),
      expect.objectContaining({ label: 'Essential Links', path: '/app/superuser/essential-links' }),
      expect.objectContaining({ label: 'Secrets & ENV', path: '/app/superuser/secrets-env' }),
      expect.objectContaining({ label: 'Coordination Runtime', path: '/app/superuser/coordination-runtime' }),
      expect.objectContaining({ label: 'Githooks & Hooks', path: '/app/superuser/husky-ci-cd' }),
      expect.objectContaining({ label: 'State Management', path: '/app/superuser/zustand-react-query' }),
      expect.objectContaining({ label: 'CI/CD', path: '/app/superuser/hook-system' }),
      expect.objectContaining({ label: 'Open Telemetry', path: '/app/superuser/open-telemetry' }),
      expect.objectContaining({ label: 'OpenAPI & FastAPI', path: '/app/superuser/openapi-fastapi' }),
      expect.objectContaining({ label: 'Databases', path: '/app/superuser/databases' }),
      expect.objectContaining({ label: 'Frontend Contracts', path: '/app/superuser/frontend-contracts' }),
      expect.objectContaining({ label: 'Dependencies', path: '/app/superuser/dependencies' }),
      expect.objectContaining({ label: 'Inventory & Cost Management', path: '/app/superuser/inventory-cost-management' }),
    ]);
    expect(devToolsSection?.items).toEqual([
      expect.objectContaining({ label: 'Layout Capture', path: '/app/superuser/design-layout-captures' }),
      expect.objectContaining({ label: 'Plan Tracker', path: '/app/superuser/plan-tracker' }),
    ]);
    expect(devOnlySection?.items).toEqual([
      expect.objectContaining({ label: 'Agchain Benchmarks (demo)', path: '/app/superuser/agchain-benchmarks-demo' }),
      expect.objectContaining({ label: 'Block Viewer Grid (demo)', path: '/app/superuser/block-viewer-grid-demo' }),
    ]);

    const allPaths = SUPERUSER_NAV_SECTIONS.flatMap((section) => section.items).map((item) => item.path);
    expect(allPaths).not.toContain('/app/superuser/control-tower-v2');
    expect(allPaths).not.toContain('/app/superuser/operational-readiness');
    expect(allPaths).not.toContain('/app/superuser/coordination-runtime-mock');
    expect(allPaths).not.toContain('/app/superuser/skill-driven-dev');
    expect(allPaths).not.toContain('/app/superuser/telemetry-logs');
    expect(allPaths).not.toContain('/app/superuser/gcp-cost-inventory');
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
