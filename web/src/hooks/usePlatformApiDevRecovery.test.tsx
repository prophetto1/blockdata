import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlatformApiDevRecovery } from './usePlatformApiDevRecovery';

const loadPlatformApiDevRecoveryStatusMock = vi.fn();
const recoverPlatformApiMock = vi.fn();

vi.mock('@/lib/platformApiDevRecovery', () => ({
  loadPlatformApiDevRecoveryStatus: (...args: unknown[]) =>
    loadPlatformApiDevRecoveryStatusMock(...args),
  recoverPlatformApi: (...args: unknown[]) => recoverPlatformApiMock(...args),
}));

const statusPayload = {
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
} as const;

const recoveryPayload = {
  ok: true,
  result: 'ok',
  action: 'recover_platform_api',
  listener_before: {
    running: false,
    pid: null,
    started_at: null,
    command_line: null,
    parent_pid: null,
    source: 'none',
  },
  listener_after: statusPayload.listener,
  steps: [
    {
      step: 'start',
      ok: true,
      pid: 41234,
      detail: 'Started approved bootstrap via start-platform-api.ps1.',
    },
  ],
  health_status_code: 200,
  ready_status_code: 200,
  failure_reason: null,
  state: statusPayload,
} as const;

describe('usePlatformApiDevRecovery', () => {
  beforeEach(() => {
    loadPlatformApiDevRecoveryStatusMock.mockReset();
    recoverPlatformApiMock.mockReset();
  });

  it('tracks in-flight recovery state and triggers the page refresh callback after success', async () => {
    loadPlatformApiDevRecoveryStatusMock.mockResolvedValue(statusPayload);

    let resolveRecovery: ((value: typeof recoveryPayload) => void) | null = null;
    const recoveryPromise = new Promise<typeof recoveryPayload>((resolve) => {
      resolveRecovery = resolve;
    });
    recoverPlatformApiMock.mockReturnValue(recoveryPromise);

    const onRecovered = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePlatformApiDevRecovery({
        enabled: true,
        onRecovered,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      void result.current.recover();
    });

    await waitFor(() => {
      expect(result.current.recovering).toBe(true);
    });

    resolveRecovery?.(recoveryPayload);

    await waitFor(() => {
      expect(result.current.recovering).toBe(false);
    });

    expect(onRecovered).toHaveBeenCalledTimes(1);
    expect(result.current.lastRecovery).toEqual(recoveryPayload);
    expect(result.current.status).toEqual(statusPayload);
    expect(result.current.error).toBeNull();
  });

  it('surfaces structured recovery errors without clearing the last known status payload', async () => {
    loadPlatformApiDevRecoveryStatusMock.mockResolvedValue(statusPayload);
    recoverPlatformApiMock.mockRejectedValue(new Error('Timed out waiting for /health/ready.'));

    const { result } = renderHook(() =>
      usePlatformApiDevRecovery({
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.recover();
    });

    expect(result.current.error).toBe('Timed out waiting for /health/ready.');
    expect(result.current.status).toEqual(statusPayload);
    expect(result.current.lastRecovery).toBeNull();
    expect(result.current.recovering).toBe(false);
  });
});
