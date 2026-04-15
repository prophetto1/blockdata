import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const refreshMock = vi.fn();
const executeActionMock = vi.fn();
const loadCheckDetailMock = vi.fn();
const verifyCheckMock = vi.fn();
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

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      refreshSession: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

async function importPage() {
  return import('./SuperuserOperationalReadiness');
}

describe('SuperuserOperationalReadiness', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    refreshMock.mockReset();
    executeActionMock.mockReset();
    loadCheckDetailMock.mockReset();
    verifyCheckMock.mockReset();
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
              evidence: {
                ready: true,
                runtime_environment: 'cloud_run',
                service_name: 'blockdata-platform-api',
                revision_name: 'blockdata-platform-api-00067-6pm',
                configuration_name: 'blockdata-platform-api',
                service_account_email: 'blockdata-platform-api-sa@agchain.iam.gserviceaccount.com',
              },
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
              available_actions: [
                {
                  action_kind: 'storage_browser_upload_cors_reconcile',
                  label: 'Reconcile bucket CORS policy',
                  description: 'Apply the checked-in browser upload CORS policy to the user-storage bucket.',
                  route: '/admin/runtime/storage/browser-upload-cors/reconcile',
                  requires_confirmation: true,
                },
              ],
              verify_after: [],
              next_if_still_failing: [],
              actionability: 'backend_action',
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
      checkDetails: {
        'blockdata.storage.bucket_cors': {
          loading: false,
          verifying: false,
          error: null,
          detail: {
            check: {
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
              actionability: 'backend_action',
              evidence: { cors_configured: false },
              remediation: 'Apply the browser upload CORS policy to the bucket.',
              checked_at: '2026-03-30T16:00:00Z',
            },
            latest_probe_run: {
              probe_run_id: 'probe-run-1',
              probe_kind: 'readiness_check_verify',
              check_id: 'blockdata.storage.bucket_cors',
              result: 'fail',
              duration_ms: 5.1,
              evidence: { status: 'fail' },
              failure_reason: 'Bucket browser-upload CORS rules are missing or incomplete.',
              created_at: '2026-04-08T16:15:00Z',
            },
            latest_action_run: null,
          },
        },
      },
      actionStates: {},
      executeAction: executeActionMock,
      loadCheckDetail: loadCheckDetailMock,
      verifyCheck: verifyCheckMock,
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

  it(
    'renders the operator dashboard with the dev recovery panel, summary runtime identity, surfaces, and client panel',
    { timeout: 15000 },
    async () => {
      const { Component } = await importPage();
      render(<Component />);

      expect(screen.queryByText(/backend-owned control plane/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Refresh Status' })).toBeInTheDocument();

      expect(screen.getByRole('heading', { level: 2, name: 'Platform API launch hygiene' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Recover platform-api' })).toBeInTheDocument();

      // Bootstrap shows ready state
      expect(screen.getByText('Snapshot loaded')).toBeInTheDocument();

      // Summary counters
      expect(screen.getByText('OK')).toBeInTheDocument();
      expect(screen.getByText('WARN')).toBeInTheDocument();
      expect(screen.getByText('FAIL')).toBeInTheDocument();
      expect(screen.getByText('Active runtime')).toBeInTheDocument();
      expect(screen.getAllByText('blockdata-platform-api').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('blockdata-platform-api-00067-6pm').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('blockdata-platform-api-sa@agchain.iam.gserviceaccount.com').length).toBeGreaterThanOrEqual(1);

      // Surfaces render in order
      expect(screen.getByText('Platform API readiness')).toBeInTheDocument();
      expect(screen.getByText('Bucket CORS')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reconcile bucket CORS policy' })).toBeInTheDocument();

      // Remediation visible for failed check
      expect(screen.getByText('Apply the browser upload CORS policy to the bucket.')).toBeInTheDocument();

      // Client panel
      expect(screen.getByText('Client Environment')).toBeInTheDocument();
      expect(screen.getByText('Frontend Origin')).toBeInTheDocument();
    },
  );

  it('hides the local recovery panel when the page is not in the supported dev helper mode', async () => {
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

    const { Component } = await importPage();
    render(<Component />);

    expect(screen.queryByRole('heading', { level: 2, name: 'Platform API launch hygiene' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recover platform-api' })).not.toBeInTheDocument();
    expect(screen.getByText('Snapshot loaded')).toBeInTheDocument();
    expect(screen.getByText('Platform API readiness')).toBeInTheDocument();
  });

  it('routes the mounted bucket CORS action through the readiness hook', async () => {
    const { Component } = await importPage();
    render(<Component />);

    fireEvent.click(screen.getByRole('button', { name: 'Reconcile bucket CORS policy' }));

    expect(executeActionMock).toHaveBeenCalledWith(
      'blockdata.storage.bucket_cors',
      expect.objectContaining({
        action_kind: 'storage_browser_upload_cors_reconcile',
        route: '/admin/runtime/storage/browser-upload-cors/reconcile',
      }),
    );
  });

  it('routes the mounted verify action through the readiness hook', async () => {
    const { Component } = await importPage();
    render(<Component />);

    fireEvent.click(screen.getByRole('button', { name: 'Verify now' }));

    expect(verifyCheckMock).toHaveBeenCalledWith('blockdata.storage.bucket_cors');
  });
});
