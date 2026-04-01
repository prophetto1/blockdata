import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Component as SuperuserOperationalReadiness } from './SuperuserOperationalReadiness';

const refreshMock = vi.fn();
const refreshStatusMock = vi.fn();
const recoverMock = vi.fn();
const useOperationalReadinessMock = vi.fn();
const usePlatformApiDevRecoveryMock = vi.fn();

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/hooks/useOperationalReadiness', () => ({
  useOperationalReadiness: () => useOperationalReadinessMock(),
}));

vi.mock('@/hooks/usePlatformApiDevRecovery', () => ({
  usePlatformApiDevRecovery: () => usePlatformApiDevRecoveryMock(),
}));

describe('SuperuserOperationalReadiness', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    refreshMock.mockReset();
    refreshStatusMock.mockReset();
    recoverMock.mockReset();

    useOperationalReadinessMock.mockReturnValue({
      loading: false,
      refreshing: false,
      error: null,
      refreshedAt: '2026-03-30T16:00:00Z',
      bootstrap: {
        diagnosis_kind: 'ready',
        diagnosis_title: 'Ready',
        diagnosis_summary: 'Bootstrap passed.',
        snapshot_available: true,
        base_mode: 'relative_proxy',
        frontend_origin: 'http://localhost:5374',
        platform_api_target: '/platform-api',
        probes: [],
      },
      summary: { ok: 4, warn: 1, fail: 1, unknown: 0 },
      surfaces: [
        {
          id: 'shared',
          label: 'Shared',
          summary: { ok: 2, warn: 1, fail: 0, unknown: 0 },
          checks: [
            {
              check_id: 'shared.platform_api.ready',
              surface_id: 'shared',
              category: 'process',
              status: 'ok',
              label: 'Platform API readiness',
              summary: 'Platform API process is healthy and ready.',
              cause: null,
              cause_confidence: null,
              depends_on: [],
              blocked_by: [],
              available_actions: [],
              verify_after: [],
              next_if_still_failing: [],
              actionability: 'info_only',
              evidence: { ready: true },
              remediation: 'No action required.',
              checked_at: '2026-03-30T16:00:00Z',
            },
          ],
        },
        {
          id: 'blockdata',
          label: 'BlockData',
          summary: { ok: 1, warn: 0, fail: 1, unknown: 0 },
          checks: [
            {
              check_id: 'blockdata.storage.bucket_cors',
              surface_id: 'blockdata',
              category: 'connectivity',
              status: 'fail',
              label: 'Bucket CORS',
              summary: 'Browser upload CORS is missing.',
              cause: null,
              cause_confidence: null,
              depends_on: [],
              blocked_by: [],
              available_actions: [],
              verify_after: [],
              next_if_still_failing: [],
              actionability: 'info_only',
              evidence: { cors_configured: false },
              remediation: 'Apply the browser upload CORS policy to the bucket.',
              checked_at: '2026-03-30T16:00:00Z',
            },
          ],
        },
        {
          id: 'agchain',
          label: 'AGChain',
          summary: { ok: 1, warn: 0, fail: 0, unknown: 0 },
          checks: [],
        },
      ],
      clientDiagnostics: [
        {
          id: 'client.origin',
          label: 'Frontend Origin',
          value: 'http://localhost:5374',
          summary: 'Current browser origin for this session.',
        },
      ],
      refresh: refreshMock,
    });

    usePlatformApiDevRecoveryMock.mockReturnValue({
      enabled: true,
      loading: false,
      recovering: false,
      error: null,
      status: {
        available_action: 'recover_platform_api',
        port: 8000,
        listener: {
          running: true,
          pid: 41234,
          started_at: '2026-03-31T16:00:00Z',
          command_line: 'python -m uvicorn app.main:app --reload --port 8000',
          parent_pid: 41200,
          source: 'tcp_listener',
        },
        launch_hygiene: {
          approved_bootstrap: 'unknown',
          provenance_basis: 'state_only',
          env_loaded: true,
          repo_root_match: true,
          state_file_present: true,
          state_path: 'E:/writing-system/.codex-tmp/platform-api-dev/state.json',
          state_written_at: '2026-03-31T16:00:00Z',
        },
        last_probe: {
          health_ok: true,
          ready_ok: true,
          detail: 'Health: /health returned 200. Ready: /health/ready returned 200.',
        },
        result: 'ok',
      },
      lastRecovery: null,
      refreshStatus: refreshStatusMock,
      recover: recoverMock,
    });
  });

  it('renders the operator dashboard with the dev recovery panel, summary, surfaces, and client panel', () => {
    render(<SuperuserOperationalReadiness />);

    expect(screen.getByRole('heading', { level: 1, name: 'Operational Readiness' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh Status' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 2, name: 'Platform API launch hygiene' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recover platform-api' })).toBeInTheDocument();

    // Bootstrap shows ready state
    expect(screen.getByText('Snapshot loaded')).toBeInTheDocument();

    // Summary counters
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('WARN')).toBeInTheDocument();
    expect(screen.getByText('FAIL')).toBeInTheDocument();

    // Surfaces render in order
    expect(screen.getByText('Platform API readiness')).toBeInTheDocument();
    expect(screen.getByText('Bucket CORS')).toBeInTheDocument();

    // Remediation visible for failed check
    expect(screen.getByText('Apply the browser upload CORS policy to the bucket.')).toBeInTheDocument();

    // Client panel
    expect(screen.getByText('Client Environment')).toBeInTheDocument();
    expect(screen.getByText('Frontend Origin')).toBeInTheDocument();
  });

  it('hides the local recovery panel when the page is not in the supported dev helper mode', () => {
    usePlatformApiDevRecoveryMock.mockReturnValue({
      enabled: false,
      loading: false,
      recovering: false,
      error: null,
      status: null,
      lastRecovery: null,
      refreshStatus: refreshStatusMock,
      recover: recoverMock,
    });

    render(<SuperuserOperationalReadiness />);

    expect(screen.queryByRole('heading', { level: 2, name: 'Platform API launch hygiene' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recover platform-api' })).not.toBeInTheDocument();
    expect(screen.getByText('Snapshot loaded')).toBeInTheDocument();
    expect(screen.getByText('Platform API readiness')).toBeInTheDocument();
  });
});
