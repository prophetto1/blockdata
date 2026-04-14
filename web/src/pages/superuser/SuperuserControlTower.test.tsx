import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseQueryResult } from '@tanstack/react-query';
import routerSource from '@/router.tsx?raw';
import { resetSuperuserControlTowerStore } from '@/stores/useSuperuserControlTowerStore';

const useOperationalReadinessSnapshotQueryMock = vi.fn();
const useCoordinationStatusQueryMock = vi.fn();
const useCoordinationIdentitiesQueryMock = vi.fn();
const useCoordinationDiscussionsQueryMock = vi.fn();
const useCoordinationStreamMock = vi.fn();
const useOperationalReadinessMock = vi.fn();
const usePlatformApiDevRecoveryMock = vi.fn();
const useQueryClientMock = vi.fn();
const useIsFetchingMock = vi.fn();

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/hooks/query/useOperationalReadinessSnapshotQuery', () => ({
  useOperationalReadinessSnapshotQuery: (...args: unknown[]) => useOperationalReadinessSnapshotQueryMock(...args),
}));

vi.mock('@/hooks/query/useCoordinationStatusQuery', () => ({
  useCoordinationStatusQuery: (...args: unknown[]) => useCoordinationStatusQueryMock(...args),
}));

vi.mock('@/hooks/query/useCoordinationIdentitiesQuery', () => ({
  useCoordinationIdentitiesQuery: (...args: unknown[]) => useCoordinationIdentitiesQueryMock(...args),
}));

vi.mock('@/hooks/query/useCoordinationDiscussionsQuery', () => ({
  useCoordinationDiscussionsQuery: (...args: unknown[]) => useCoordinationDiscussionsQueryMock(...args),
}));

vi.mock('@/hooks/useCoordinationStream', () => ({
  useCoordinationStream: (...args: unknown[]) => useCoordinationStreamMock(...args),
}));

vi.mock('@/hooks/useOperationalReadiness', () => ({
  useOperationalReadiness: (...args: unknown[]) => useOperationalReadinessMock(...args),
}));

vi.mock('@/hooks/usePlatformApiDevRecovery', () => ({
  usePlatformApiDevRecovery: (...args: unknown[]) => usePlatformApiDevRecoveryMock(...args),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: (...args: unknown[]) => useQueryClientMock(...args),
    useIsFetching: (...args: unknown[]) => useIsFetchingMock(...args),
  };
});

function asQueryResult<T>(overrides: Partial<UseQueryResult<T>>): UseQueryResult<T> {
  return {
    data: undefined,
    error: null,
    isError: false,
    isLoading: false,
    isPending: false,
    isFetching: false,
    isSuccess: true,
    status: 'success',
    fetchStatus: 'idle',
    refetch: vi.fn(),
    ...overrides,
  } as UseQueryResult<T>;
}

const readinessData = {
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
  snapshot: {
    generated_at: '2026-04-14T12:00:00Z',
    summary: { ok: 7, warn: 1, fail: 0, unknown: 0 },
    surfaces: [],
  },
  clientDiagnostics: [
    {
      id: 'client.origin',
      label: 'Frontend Origin',
      value: 'http://localhost:5374',
      summary: 'Current browser origin for this session.',
    },
    {
      id: 'client.platform_api_target',
      label: 'Platform API Target',
      value: '/platform-api',
      summary: 'Resolved platform API target for this session.',
    },
  ],
};

const coordinationStatusData = {
  broker: { state: 'available', url: 'nats://127.0.0.1:4222', server: 'JON', error_type: null },
  streams: {},
  kv_buckets: {},
  presence_summary: { active_agents: 3 },
  identity_summary: {
    active_count: 3,
    stale_count: 1,
    host_count: 1,
    family_counts: { cdx: 3 },
  },
  discussion_summary: {
    thread_count: 2,
    pending_count: 1,
    stale_count: 0,
    workspace_bound_count: 2,
  },
  session_classification_summary: {
    classified_count: 3,
    unknown_count: 0,
    counts_by_type: {
      'vscode.cc.cli': 0,
      'vscode.cdx.cli': 2,
      'vscode.cc.ide-panel': 0,
      'vscode.cdx.ide-panel': 0,
      'claude-desktop.cc': 0,
      'codex-app-win.cdx': 0,
      'terminal.cc': 1,
      'terminal.cdx': 0,
      unknown: 0,
    },
    counts_by_provenance: {
      launch_stamped: 2,
      runtime_observed: 1,
      configured: 0,
      inferred: 0,
      unknown: 0,
    },
  },
  hook_audit_summary: {
    state: 'observed',
    record_count: 4,
    allow_count: 2,
    warn_count: 1,
    block_count: 1,
    error_count: 0,
  },
  local_host_outbox_backlog: { files: 0, events: 0, bytes: 0 },
  app_runtime: { runtime_enabled: true, host: 'JON', runtime_root: 'E:/writing-system' },
  stream_bridge: { state: 'connected', client_count: 1, last_error: null },
};

const coordinationIdentitiesData = {
  summary: {
    active_count: 3,
    stale_count: 1,
    host_count: 1,
    family_counts: { cdx: 3 },
    session_classification_counts: {
      'vscode.cc.cli': 0,
      'vscode.cdx.cli': 2,
      'vscode.cc.ide-panel': 0,
      'vscode.cdx.ide-panel': 0,
      'claude-desktop.cc': 0,
      'codex-app-win.cdx': 0,
      'terminal.cc': 1,
      'terminal.cdx': 0,
      unknown: 0,
    },
    session_classification_unknown_count: 0,
    session_classification_provenance_counts: {
      launch_stamped: 2,
      runtime_observed: 1,
      configured: 0,
      inferred: 0,
      unknown: 0,
    },
  },
  identities: [
    {
      lease_identity: 'jon-runtime',
      identity: 'jon-runtime',
      host: 'JON',
      family: 'cdx',
      session_agent_id: 'jon-runtime',
      claimed_at: '2026-04-14T12:00:00Z',
      last_heartbeat_at: '2026-04-14T12:01:00Z',
      expires_at: '2026-04-14T12:03:00Z',
      stale: false,
      revision: 3,
      session_classification: {
        key: 'vscode.cdx.cli',
        display_label: 'VS Code | CDX CLI',
        container_host: 'vscode',
        interaction_surface: 'cli',
        runtime_product: 'cdx',
        classified: true,
        registry_version: 1,
        reason: null,
        provenance: {
          key: 'launch_stamped',
          container_host: 'launch_stamped',
          interaction_surface: 'launch_stamped',
          runtime_product: 'launch_stamped',
          display_label: 'derived',
        },
      },
    },
  ],
};

const coordinationDiscussionsData = {
  summary: {
    thread_count: 2,
    pending_count: 1,
    stale_count: 0,
    workspace_bound_count: 2,
  },
  discussions: [
    {
      task_id: 'task-1',
      workspace_type: 'research',
      workspace_path: 'E:/writing-system/_research/20260411--07--zustand-tanstack-and-FR-architecture',
      directional_doc: 'E:/writing-system/_research/20260411--07--zustand-tanstack-and-FR-architecture/phase-2/0412--03--zustand-tanstack-superuser-control-tower-implementation-plan--CDX.md',
      participants: [{ host: 'JON', agent_id: 'codex' }],
      pending_recipients: [{ host: 'JON', agent_id: 'buddy' }],
      last_event_kind: 'response_requested',
      status: 'pending',
      updated_at: '2026-04-14T12:00:00Z',
    },
  ],
};

const operationalReadinessPanelData = {
  loading: false,
  refreshing: false,
  error: null,
  refreshedAt: '2026-04-14T12:00:00Z',
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
  summary: { ok: 7, warn: 1, fail: 0, unknown: 0 },
  surfaces: [],
  clientDiagnostics: [],
  actionStates: {},
  checkDetails: {},
  executeAction: vi.fn(),
  loadCheckDetail: vi.fn(),
  verifyCheck: vi.fn(),
  refresh: vi.fn(),
};

const platformApiDevRecoveryData = {
  enabled: false,
  loading: false,
  recovering: false,
  error: null,
  status: null,
  lastRecovery: null,
  refreshStatus: vi.fn(),
  recover: vi.fn(),
};

async function renderPage() {
  const { Component: SuperuserControlTower } = await import('./SuperuserControlTower');
  return render(
    <MemoryRouter initialEntries={['/app/superuser']}>
      <SuperuserControlTower />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  resetSuperuserControlTowerStore();
  useOperationalReadinessSnapshotQueryMock.mockReturnValue(asQueryResult({ data: readinessData }));
  useCoordinationStatusQueryMock.mockReturnValue(asQueryResult({ data: coordinationStatusData }));
  useCoordinationIdentitiesQueryMock.mockReturnValue(asQueryResult({ data: coordinationIdentitiesData }));
  useCoordinationDiscussionsQueryMock.mockReturnValue(asQueryResult({ data: coordinationDiscussionsData }));
  useCoordinationStreamMock.mockReturnValue({
    events: [
      {
        event_id: 'evt-1',
        subject: 'coord.tasks.task-1.event.created',
        task_id: 'task-1',
        event_kind: 'created',
        host: 'JON',
        agent_id: 'codex',
        buffered: false,
        occurred_at: '2026-04-14T12:00:00Z',
        payload: {},
      },
    ],
    paused: false,
    connectionState: 'connected',
    error: null,
    disabledReason: null,
    togglePaused: vi.fn(),
    clear: vi.fn(),
  });
  useOperationalReadinessMock.mockReturnValue(operationalReadinessPanelData);
  usePlatformApiDevRecoveryMock.mockReturnValue(platformApiDevRecoveryData);
  useQueryClientMock.mockReturnValue({
    invalidateQueries: vi.fn(),
    getQueryCache: () => ({
      findAll: () => [{ isStale: () => false }, { isStale: () => true }],
    }),
  });
  useIsFetchingMock.mockReturnValue(0);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  resetSuperuserControlTowerStore();
});

describe('SuperuserControlTower', () => {
  it('renders the promoted dense control tower and keeps it on the superuser homepage route', async () => {
    await renderPage();

    expect(screen.queryByText('Operator Console')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Five coordination state cards up top. Select Browser State to pull down the full operational-readiness surface without leaving the superuser homepage.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('Browser State').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Coordination State').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Identity + Routing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Policy + Hooks').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Repo-time Enforcement').length).toBeGreaterThan(0);
    expect(screen.queryByText('State + Query Health')).not.toBeInTheDocument();
    expect(screen.queryByText('Coordination + Routing')).not.toBeInTheDocument();
    expect(screen.queryByText('Hook Policy + Audit')).not.toBeInTheDocument();
    expect(routerSource).toContain("import('@/pages/superuser/SuperuserControlTower')");
    expect(routerSource).not.toContain('control-tower-v2');
    expect(screen.queryByText(/control tower v2/i)).not.toBeInTheDocument();
  });

  it('lets the first card pull down the live operational readiness section', async () => {
    await renderPage();

    expect(screen.queryByRole('button', { name: /pull down readiness/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open readiness/i })).not.toBeInTheDocument();
    expect(screen.getByText('pull out panel')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /select browser state/i }));

    expect(screen.queryByText(/backend-owned control plane/i)).not.toBeInTheDocument();
    expect(screen.getByText(/snapshot loaded/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open runtime' })).toHaveAttribute(
      'href',
      '/app/superuser/coordination-runtime',
    );
    expect(screen.getByRole('link', { name: 'Inspect routing' })).toHaveAttribute(
      'href',
      '/app/superuser/coordination-runtime',
    );
    expect(screen.getByRole('link', { name: 'Open runtime summary' })).toHaveAttribute(
      'href',
      '/app/superuser/coordination-runtime',
    );
    expect(screen.getByRole('link', { name: 'Open plan tracker' })).toHaveAttribute(
      'href',
      '/app/superuser/plan-tracker',
    );
  });
});
