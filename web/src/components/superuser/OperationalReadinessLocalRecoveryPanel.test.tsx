import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OperationalReadinessLocalRecoveryPanel } from './OperationalReadinessLocalRecoveryPanel';

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
  result: 'ok' as const,
};

describe('OperationalReadinessLocalRecoveryPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders launch hygiene fields and the fixed recovery action', () => {
    const onRecover = vi.fn();

    render(
      <OperationalReadinessLocalRecoveryPanel
        loading={false}
        recovering={false}
        error={null}
        status={statusPayload}
        lastRecovery={null}
        onRecover={onRecover}
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Platform API launch hygiene' })).toBeInTheDocument();
    expect(screen.getByText('Approved bootstrap')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('Provenance basis')).toBeInTheDocument();
    expect(screen.getByText('state_only')).toBeInTheDocument();
    expect(screen.getByText('Env loaded')).toBeInTheDocument();
    expect(screen.getAllByText('Yes')).toHaveLength(2);
    expect(screen.getByText('Repo root match')).toBeInTheDocument();
    expect(screen.getByText('Present')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Recover platform-api' }));
    expect(onRecover).toHaveBeenCalledTimes(1);
  });
});
