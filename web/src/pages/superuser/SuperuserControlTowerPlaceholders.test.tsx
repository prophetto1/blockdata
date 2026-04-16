import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import routerSource from '@/router.tsx?raw';
import { SUPERUSER_NAV_SECTIONS } from '@/components/admin/AdminLeftNav';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

const DESCRIBED_PAGES = [
  {
    label: 'Essential Links',
    path: '/app/superuser/essential-links',
    route: "path: 'essential-links'",
    testId: 'superuser-essential-links-placeholder',
    summaryPattern: /local dev environment related servers, location of deploy scripts/i,
    importPage: () => import('./SuperuserEssentialLinks'),
  },
  {
    label: 'Secrets & ENV',
    path: '/app/superuser/secrets-env',
    route: "path: 'secrets-env'",
    testId: 'superuser-secrets-env-placeholder',
    summaryPattern: /superuser platform operator.*secrets, passwords & envs/i,
    importPage: () => import('./SuperuserSecretsEnv'),
  },
  {
    label: 'Githooks & Hooks',
    path: '/app/superuser/husky-ci-cd',
    route: "path: 'husky-ci-cd'",
    testId: 'superuser-husky-ci-cd-placeholder',
    summaryPattern: /while husky has been implemented a proper hook system has not yet been implemented/i,
    importPage: () => import('./SuperuserHuskyCiCd'),
  },
  {
    label: 'CI/CD',
    path: '/app/superuser/hook-system',
    route: "path: 'hook-system'",
    testId: 'superuser-hook-system-placeholder',
    summaryPattern: /the purpose of this page is the same as the no 1/i,
    importPage: () => import('./SuperuserHookSystem'),
  },
] as const;

const BLANK_PAGES = [
  {
    label: 'Open Telemetry',
    path: '/app/superuser/open-telemetry',
    route: "path: 'open-telemetry'",
    testId: 'superuser-telemetry-logs-placeholder',
    importPage: () => import('./SuperuserTelemetryLogs'),
  },
  {
    label: 'Databases',
    path: '/app/superuser/databases',
    route: "path: 'databases'",
    testId: 'superuser-databases-placeholder',
    importPage: () => import('./SuperuserDatabases'),
  },
  {
    label: 'Frontend Contracts',
    path: '/app/superuser/frontend-contracts',
    route: "path: 'frontend-contracts'",
    testId: 'superuser-frontend-contracts-placeholder',
    importPage: () => import('./SuperuserFrontendContracts'),
  },
  {
    label: 'Dependencies',
    path: '/app/superuser/dependencies',
    route: "path: 'dependencies'",
    testId: 'superuser-dependencies-placeholder',
    importPage: () => import('./SuperuserDependencies'),
  },
  {
    label: 'Inventory & Cost Management',
    path: '/app/superuser/inventory-cost-management',
    route: "path: 'inventory-cost-management'",
    testId: 'superuser-inventory-cost-management-placeholder',
    importPage: () => import('./SuperuserInventoryCostManagement'),
  },
] as const;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Superuser control-tower placeholders', () => {
  it.each([...DESCRIBED_PAGES, ...BLANK_PAGES])(
    'registers $label in the Control Tower rail and router',
    ({ path, route }) => {
      const controlTowerSection = SUPERUSER_NAV_SECTIONS.find((section) => section.label === 'CONTROL TOWER');

      expect(controlTowerSection?.items.some((item) => item.path === path)).toBe(true);
      expect(routerSource).toContain(route);
    },
  );

  it.each(DESCRIBED_PAGES)(
    'renders $label using only the provided description copy',
    async ({ label, importPage, summaryPattern, testId }) => {
      const { Component } = await importPage();
      render(<Component />);

      expect(screen.queryByRole('heading', { name: label })).not.toBeInTheDocument();
      expect(screen.getByTestId(testId)).toBeInTheDocument();
      expect(screen.getByText(summaryPattern)).toBeInTheDocument();
      expect(screen.queryByText(/control tower placeholder/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/this control tower surface is reserved for upcoming implementation work/i),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /planned focus/i })).not.toBeInTheDocument();
    },
  );

  it.each(BLANK_PAGES)(
    'renders $label as an intentionally blank page body',
    async ({ label, importPage, testId }) => {
      const { Component } = await importPage();
      render(<Component />);

      expect(screen.queryByRole('heading', { name: label })).not.toBeInTheDocument();
      expect(screen.getByTestId(testId)).toBeInTheDocument();
      expect(screen.getByTestId(testId)).toBeEmptyDOMElement();
      expect(screen.queryByText(/control tower placeholder/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/this control tower surface is reserved for upcoming implementation work/i),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /planned focus/i })).not.toBeInTheDocument();
    },
  );
});
