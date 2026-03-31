import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component as SuperuserOperationalReadiness } from '@/pages/superuser/SuperuserOperationalReadiness';

const useOperationalReadinessMock = vi.fn();

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: () => undefined,
}));

vi.mock('@/hooks/useOperationalReadiness', () => ({
  useOperationalReadiness: () => useOperationalReadinessMock(),
}));

vi.mock('@/components/superuser/OperationalReadinessBootstrapPanel', () => ({
  OperationalReadinessBootstrapPanel: ({
    bootstrap,
  }: {
    bootstrap: {
      diagnosis_title: string;
      diagnosis_summary: string;
      platform_api_target: string;
      base_mode: string;
    };
  }) => (
    <section data-testid="bootstrap-panel">
      <h2>{bootstrap.diagnosis_title}</h2>
      <p>{bootstrap.diagnosis_summary}</p>
      <p>{bootstrap.platform_api_target}</p>
      <p>{bootstrap.base_mode}</p>
    </section>
  ),
}));

vi.mock('@/components/superuser/OperationalReadinessSummary', () => ({
  OperationalReadinessSummary: () => <div data-testid="readiness-summary">summary</div>,
}));

vi.mock('@/components/superuser/OperationalReadinessCheckGrid', () => ({
  OperationalReadinessCheckGrid: () => <div data-testid="readiness-grid">grid</div>,
}));

vi.mock('@/components/superuser/OperationalReadinessClientPanel', () => ({
  OperationalReadinessClientPanel: () => <div data-testid="client-panel">client</div>,
}));

afterEach(() => {
  cleanup();
});

describe('OperationalReadiness bootstrap-first page flow', () => {
  beforeEach(() => {
    useOperationalReadinessMock.mockReset();
  });

  it('renders bootstrap diagnosis as the first operator surface and hides summary cards when no snapshot is available', () => {
    useOperationalReadinessMock.mockReturnValue({
      loading: false,
      refreshing: false,
      error: null,
      refreshedAt: null,
      summary: null,
      surfaces: [
        {
          id: 'shared',
          label: 'Shared',
          summary: { ok: 0, warn: 0, fail: 1, unknown: 0 },
          checks: [],
        },
      ],
      bootstrap: {
        diagnosis_kind: 'platform_api_unreachable',
        diagnosis_title: 'Platform API unreachable',
        diagnosis_summary: 'The browser could not reach the configured platform API target.',
        snapshot_available: false,
        base_mode: 'absolute_direct',
        frontend_origin: 'http://localhost:5374',
        platform_api_target: 'http://localhost:8001',
        probes: [],
      },
      clientDiagnostics: [],
      refresh: vi.fn(),
    });

    render(<SuperuserOperationalReadiness />);

    expect(screen.getByTestId('bootstrap-panel')).toBeInTheDocument();
    expect(screen.getByText('Platform API unreachable')).toBeInTheDocument();
    expect(screen.getByText('http://localhost:8001')).toBeInTheDocument();
    expect(screen.queryByTestId('readiness-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('readiness-grid')).not.toBeInTheDocument();
  });

  it('shows summary cards and surface grids only after bootstrap reports an authoritative snapshot', () => {
    useOperationalReadinessMock.mockReturnValue({
      loading: false,
      refreshing: false,
      error: null,
      refreshedAt: '2026-03-30T16:00:00Z',
      summary: { ok: 2, warn: 1, fail: 0, unknown: 0 },
      surfaces: [
        {
          id: 'shared',
          label: 'Shared',
          summary: { ok: 1, warn: 1, fail: 0, unknown: 0 },
          checks: [],
        },
      ],
      bootstrap: {
        diagnosis_kind: 'ready',
        diagnosis_title: 'Ready',
        diagnosis_summary: 'Bootstrap checks passed and the readiness snapshot is authoritative.',
        snapshot_available: true,
        base_mode: 'relative_proxy',
        frontend_origin: 'http://localhost:5374',
        platform_api_target: '/platform-api',
        probes: [],
      },
      clientDiagnostics: [],
      refresh: vi.fn(),
    });

    render(<SuperuserOperationalReadiness />);

    expect(screen.getByTestId('bootstrap-panel')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByTestId('readiness-summary')).toBeInTheDocument();
    expect(screen.getByTestId('readiness-grid')).toBeInTheDocument();
  });
});
