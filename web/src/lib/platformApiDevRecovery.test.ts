import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadPlatformApiDevRecoveryStatus,
  recoverPlatformApi,
} from './platformApiDevRecovery';

const fetchMock = vi.fn<typeof fetch>();

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

describe('platformApiDevRecovery', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads fixed localhost status payload from the dev helper route', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(statusPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await loadPlatformApiDevRecoveryStatus();

    expect(fetchMock).toHaveBeenCalledWith('/__admin/platform-api/status', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    expect(result).toEqual(statusPayload);
  });

  it('posts to the fixed recover route and returns the structured recovery payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(recoveryPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await recoverPlatformApi();

    expect(fetchMock).toHaveBeenCalledWith('/__admin/platform-api/recover', {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    expect(result).toEqual(recoveryPayload);
  });

  it('surfaces structured helper errors from a non-ok status response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Local requests only' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(loadPlatformApiDevRecoveryStatus()).rejects.toThrow('Local requests only');
  });

  it('throws the recovery failure reason when the helper returns an unsuccessful payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ...recoveryPayload,
          ok: false,
          result: 'fail',
          failure_reason: 'Timed out waiting for /health/ready.',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await expect(recoverPlatformApi()).rejects.toThrow('Timed out waiting for /health/ready.');
  });
});
