import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CoordinationIdentityTable } from './CoordinationIdentityTable';
import type { CoordinationIdentityResponse } from '@/lib/coordinationApi';

const payload: CoordinationIdentityResponse = {
  summary: {
    active_count: 1,
    stale_count: 1,
    host_count: 1,
    family_counts: { cdx: 2 },
    session_classification_counts: {
      'vscode.cc.cli': 0,
      'vscode.cdx.cli': 1,
      'vscode.cc.ide-panel': 0,
      'vscode.cdx.ide-panel': 0,
      'claude-desktop.cc': 0,
      'codex-app-win.cdx': 0,
      'terminal.cc': 0,
      'terminal.cdx': 0,
      unknown: 1,
    },
    session_classification_unknown_count: 1,
    session_classification_provenance_counts: {
      launch_stamped: 1,
      runtime_observed: 0,
      configured: 0,
      inferred: 0,
      unknown: 1,
    },
  },
  identities: [
    {
      lease_identity: 'cdx',
      identity: 'cdx',
      host: 'JON',
      family: 'cdx',
      session_agent_id: 'jon-runtime',
      claimed_at: '2026-04-11T12:00:00Z',
      last_heartbeat_at: '2026-04-11T12:01:00Z',
      expires_at: '2026-04-11T12:03:00Z',
      stale: false,
      revision: 4,
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
    {
      lease_identity: 'cc2',
      identity: 'cc2',
      host: 'JON',
      family: 'cc',
      session_agent_id: 'jon-runtime-2',
      claimed_at: '2026-04-11T12:00:10Z',
      last_heartbeat_at: '2026-04-11T12:00:30Z',
      expires_at: '2026-04-11T12:01:00Z',
      stale: true,
      revision: 5,
      session_classification: {
        key: 'unknown',
        display_label: 'Unknown',
        container_host: 'vscode',
        interaction_surface: 'unknown',
        runtime_product: 'unknown',
        classified: false,
        registry_version: 1,
        reason: 'insufficient_signal',
        provenance: {
          key: 'unknown',
          container_host: 'launch_stamped',
          interaction_surface: 'unknown',
          runtime_product: 'unknown',
          display_label: 'derived',
        },
      },
    },
  ],
};

afterEach(() => {
  cleanup();
});

describe('CoordinationIdentityTable', () => {
  it('renders an explicit loading state when identity data is still pending', () => {
    render(<CoordinationIdentityTable data={null} loading />);

    expect(screen.getByText('Loading claimed identities...')).toBeInTheDocument();
    expect(screen.getAllByText('Loading...')).toHaveLength(3);
  });

  it('renders classification-first rows with lease metadata and provenance', () => {
    render(<CoordinationIdentityTable data={payload} loading={false} />);

    expect(screen.getByTestId('coordination-identity-table')).toBeInTheDocument();
    expect(screen.getByText('Claimed Identities')).toBeInTheDocument();
    expect(screen.getByText('1 active')).toBeInTheDocument();
    expect(screen.getByText('1 stale')).toBeInTheDocument();
    expect(screen.getByText('1 host')).toBeInTheDocument();
    expect(screen.getByText('VS Code | CDX CLI')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText(/lease cdx/i)).toBeInTheDocument();
    expect(screen.getByText(/lease cc2/i)).toBeInTheDocument();
    expect(screen.getByText('jon-runtime')).toBeInTheDocument();
    expect(screen.getByText('launch_stamped')).toBeInTheDocument();
    expect(screen.getByText('stale')).toBeInTheDocument();
    expect(screen.getAllByTestId('coordination-identity-row')).toHaveLength(2);
  });

  it('uses the server display_label when present and falls back only when absent', () => {
    const fallbackPayload = {
      summary: payload.summary,
      identities: [
        {
          ...payload.identities[0],
          session_classification: {
            ...payload.identities[0].session_classification,
            display_label: 'Operator Label',
          },
        },
        {
          ...payload.identities[1],
          lease_identity: 'terminal-cc',
          identity: 'terminal-cc',
          session_classification: {
            ...payload.identities[1].session_classification,
            key: 'terminal.cc',
            display_label: undefined,
            container_host: 'terminal',
            interaction_surface: 'cli',
            runtime_product: 'cc',
            classified: true,
            reason: null,
            provenance: {
              key: 'runtime_observed',
              container_host: 'runtime_observed',
              interaction_surface: 'runtime_observed',
              runtime_product: 'runtime_observed',
              display_label: 'derived',
            },
          },
        },
      ],
    } as unknown as CoordinationIdentityResponse;

    render(<CoordinationIdentityTable data={fallbackPayload} loading={false} />);

    expect(screen.getByText('Operator Label')).toBeInTheDocument();
    expect(screen.queryByText('VS Code | CDX CLI')).not.toBeInTheDocument();
    expect(screen.getByText('Terminal | CC')).toBeInTheDocument();
  });

  it('renders an explicit empty state when no identities are present', () => {
    render(
      <CoordinationIdentityTable
        data={{
          summary: {
            active_count: 0,
            stale_count: 0,
            host_count: 0,
            family_counts: {},
            session_classification_counts: {
              'vscode.cc.cli': 0,
              'vscode.cdx.cli': 0,
              'vscode.cc.ide-panel': 0,
              'vscode.cdx.ide-panel': 0,
              'claude-desktop.cc': 0,
              'codex-app-win.cdx': 0,
              'terminal.cc': 0,
              'terminal.cdx': 0,
              unknown: 0,
            },
            session_classification_unknown_count: 0,
            session_classification_provenance_counts: {
              launch_stamped: 0,
              runtime_observed: 0,
              configured: 0,
              inferred: 0,
              unknown: 0,
            },
          },
          identities: [],
        }}
        loading={false}
      />,
    );

    expect(screen.getByText('No claimed identities are currently visible.')).toBeInTheDocument();
  });

  it('treats null data as an empty state once loading completes', () => {
    render(<CoordinationIdentityTable data={null} loading={false} />);

    expect(screen.getByText('0 active')).toBeInTheDocument();
    expect(screen.getByText('0 stale')).toBeInTheDocument();
    expect(screen.getByText('0 host')).toBeInTheDocument();
    expect(screen.getByText('No claimed identities are currently visible.')).toBeInTheDocument();
  });
});
