import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoordinationEventFeed } from '@/components/superuser/CoordinationEventFeed';
import { useCoordinationStream } from '@/hooks/useCoordinationStream';
import { CoordinationRuntimeDisabledError } from '@/lib/coordinationApi';
import routerSource from '@/router.tsx?raw';

const platformApiFetchMock = vi.fn();
const useCoordinationStatusQueryMock = vi.fn();
const useCoordinationIdentitiesQueryMock = vi.fn();
const useCoordinationDiscussionsQueryMock = vi.fn();

vi.mock('react-pdf-highlighter', () => ({
  AreaHighlight: () => null,
  Highlight: () => null,
  PdfHighlighter: () => null,
  PdfLoader: () => null,
  Popup: () => null,
}));

vi.mock('react-pdf-highlighter/dist/style.css', () => ({}));

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('@/hooks/query/useCoordinationStatusQuery', () => ({
  useCoordinationStatusQuery: () => useCoordinationStatusQueryMock(),
}));

vi.mock('@/hooks/query/useCoordinationIdentitiesQuery', () => ({
  useCoordinationIdentitiesQuery: () => useCoordinationIdentitiesQueryMock(),
}));

vi.mock('@/hooks/query/useCoordinationDiscussionsQuery', () => ({
  useCoordinationDiscussionsQuery: () => useCoordinationDiscussionsQueryMock(),
}));

function eventStreamResponse(frames: string[], options: { close?: boolean } = {}) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(frame));
      }
      if (options.close ?? true) {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

async function importPage() {
  return import('./CoordinationRuntime');
}

async function renderRuntimePage() {
  const { Component } = await importPage();
  return render(<Component />);
}

function createQueryResult<T>({
  data,
  error = null,
  isPending = false,
  isSuccess = data !== undefined && error == null && !isPending,
}: {
  data?: T;
  error?: unknown;
  isPending?: boolean;
  isSuccess?: boolean;
}) {
  return {
    data,
    error,
    isPending,
    isSuccess,
  };
}

describe('CoordinationRuntime', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    useCoordinationStatusQueryMock.mockReset();
    useCoordinationIdentitiesQueryMock.mockReset();
    useCoordinationDiscussionsQueryMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('registers the coordination runtime route under superuser', () => {
    expect(routerSource).toContain("path: 'coordination-runtime'");
    expect(routerSource).not.toContain("path: 'coordination-runtime-mock'");
  });

  it('keeps the live event buffer bounded to the latest 250 entries', async () => {
    const frames = [
      'data: {"type":"control","state":"connected","occurred_at":"2026-04-09T12:00:00Z"}\n\n',
      ...Array.from({ length: 260 }, (_, index) => (
        `data: ${JSON.stringify({
          event_id: `evt-${index + 1}`,
          subject: `coord.tasks.task-${index + 1}.event.progress`,
          task_id: `task-${index + 1}`,
          event_kind: 'progress',
          host: 'JON',
          agent_id: 'buddy',
          buffered: false,
          occurred_at: '2026-04-09T12:00:00Z',
          payload: {},
        })}\n\n`
      )),
    ];
    platformApiFetchMock.mockResolvedValue(eventStreamResponse(frames));

    const { result } = renderHook(() => useCoordinationStream());

    await waitFor(() => {
      expect(result.current.events).toHaveLength(250);
    });

    expect(result.current.events[0]?.event_id).toBe('evt-11');
    expect(result.current.events.at(-1)?.event_id).toBe('evt-260');
  });

  it('reconnects after a clean stream close and resumes receiving events', async () => {
    platformApiFetchMock
      .mockResolvedValueOnce(
        eventStreamResponse([
          'data: {"type":"control","state":"connected","occurred_at":"2026-04-09T12:00:00Z"}\n\n',
        ]),
      )
      .mockResolvedValueOnce(
        eventStreamResponse([
          'data: {"type":"control","state":"connected","occurred_at":"2026-04-09T12:00:01Z"}\n\n',
          `data: ${JSON.stringify({
            event_id: 'evt-reconnected',
            subject: 'coord.tasks.task-9.event.created',
            task_id: 'task-9',
            event_kind: 'created',
            host: 'JON',
            agent_id: 'buddy',
            buffered: false,
            occurred_at: '2026-04-09T12:00:02Z',
            payload: {},
          })}\n\n`,
        ], { close: false }),
      );

    const { result } = renderHook(() => useCoordinationStream());

    await waitFor(() => {
      expect(result.current.events.at(-1)?.event_id).toBe('evt-reconnected');
    });

    expect(platformApiFetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.connectionState).toBe('connected');
  });

  it(
    'renders explicit disabled state when the backend disables coordination runtime',
    { timeout: 15000 },
    async () => {
    useCoordinationStatusQueryMock.mockReturnValue(
      createQueryResult({
        error: new CoordinationRuntimeDisabledError('Coordination runtime is disabled'),
        isSuccess: false,
      }),
    );
    useCoordinationIdentitiesQueryMock.mockReturnValue(createQueryResult({ isSuccess: false }));
    useCoordinationDiscussionsQueryMock.mockReturnValue(createQueryResult({ isSuccess: false }));

    await renderRuntimePage();

    expect(screen.getByTestId('coordination-runtime-disabled')).toHaveTextContent(
      /coordination runtime is disabled/i,
    );
    expect(screen.queryByText(/broker-backed admin runtime/i)).not.toBeInTheDocument();
    expect(platformApiFetchMock).not.toHaveBeenCalled();
    },
  );

  it('renders an error alert when the initial runtime status request fails', async () => {
    useCoordinationStatusQueryMock.mockReturnValue(
      createQueryResult({
        error: new Error('Coordination fetch failed'),
        isSuccess: false,
      }),
    );
    useCoordinationIdentitiesQueryMock.mockReturnValue(createQueryResult({ isSuccess: false }));
    useCoordinationDiscussionsQueryMock.mockReturnValue(createQueryResult({ isSuccess: false }));

    await renderRuntimePage();

    expect(screen.getByText(/coordination fetch failed/i)).toBeInTheDocument();
  });

  it('loads the status, identity, and discussion operator panels on the runtime page', async () => {
    const statusFixture = {
      broker: { state: 'available', url: 'nats://127.0.0.1:4222' },
      streams: { COORD_EVENTS: { messages: 3 } },
      kv_buckets: { COORD_AGENT_PRESENCE: { active_keys: 2 } },
      presence_summary: { active_agents: 2 },
      identity_summary: { active_count: 2, stale_count: 0, host_count: 1, family_counts: { cdx: 2 } },
      discussion_summary: { thread_count: 1, pending_count: 1, stale_count: 0, workspace_bound_count: 1 },
      session_classification_summary: {
        classified_count: 2,
        unknown_count: 1,
        counts_by_type: {
          'vscode.cc.cli': 0,
          'vscode.cdx.cli': 1,
          'vscode.cc.ide-panel': 0,
          'vscode.cdx.ide-panel': 0,
          'claude-desktop.cc': 0,
          'codex-app-win.cdx': 0,
          'terminal.cc': 1,
          'terminal.cdx': 0,
          unknown: 1,
        },
        counts_by_provenance: {
          launch_stamped: 1,
          runtime_observed: 1,
          configured: 0,
          inferred: 0,
          unknown: 1,
        },
      },
      hook_audit_summary: {
        state: 'not_configured',
        record_count: 0,
        allow_count: 0,
        warn_count: 0,
        block_count: 0,
        error_count: 0,
      },
      local_host_outbox_backlog: { files: 0, events: 0, bytes: 0 },
      app_runtime: { runtime_enabled: true, host: 'JON', runtime_root: 'E:/writing-system' },
      stream_bridge: { state: 'connected', client_count: 1, last_error: null },
    };
    const identitiesFixture = {
      summary: {
        active_count: 1,
        stale_count: 0,
        host_count: 1,
        family_counts: { cdx: 1 },
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
      ],
    };
    const discussionsFixture = {
      summary: { thread_count: 1, pending_count: 1, stale_count: 0, workspace_bound_count: 1 },
      discussions: [
        {
          task_id: 'task-1',
          workspace_type: 'research',
          workspace_path: 'E:/writing-system/_collaborate/research/topic',
          directional_doc: 'E:/writing-system/_collaborate/research/topic/plan.md',
          participants: [{ host: 'JON', agent_id: 'cdx' }],
          pending_recipients: [{ host: 'JON', agent_id: 'cdx2' }],
          last_event_kind: 'response_requested',
          status: 'pending',
          updated_at: '2026-04-11T12:00:00Z',
        },
      ],
    };

    useCoordinationStatusQueryMock.mockReturnValue(createQueryResult({ data: statusFixture }));
    useCoordinationIdentitiesQueryMock.mockReturnValue(createQueryResult({ data: identitiesFixture }));
    useCoordinationDiscussionsQueryMock.mockReturnValue(createQueryResult({ data: discussionsFixture }));
    platformApiFetchMock.mockResolvedValue(eventStreamResponse([]));

    await renderRuntimePage();

    expect(await screen.findByRole('heading', { name: /identities/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /coordination runtime/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/live coordination operator console/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^refresh$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/observe broker health, bridge state, local backlog/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /inspector/i })).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('STALE')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('BUFFERED')).toBeInTheDocument();
    expect(screen.getAllByText('jon-runtime').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CDX CLI/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('launch_stamped').length).toBeGreaterThan(0);
    expect(screen.getByTestId('coordination-discussion-queue')).toBeInTheDocument();
    expect(useCoordinationStatusQueryMock).toHaveBeenCalled();
    expect(useCoordinationIdentitiesQueryMock).toHaveBeenCalled();
    expect(useCoordinationDiscussionsQueryMock).toHaveBeenCalled();
  });

  it('updates the inspector when a different identity is selected', async () => {
    const statusFixture = {
      broker: { state: 'available', url: 'nats://127.0.0.1:4222' },
      streams: { COORD_EVENTS: { messages: 3 } },
      kv_buckets: { COORD_AGENT_PRESENCE: { active_keys: 2 } },
      presence_summary: { active_agents: 2 },
      identity_summary: { active_count: 1, stale_count: 1, host_count: 2, family_counts: { cdx: 1, cc: 1 } },
      discussion_summary: { thread_count: 0, pending_count: 0, stale_count: 0, workspace_bound_count: 0 },
      session_classification_summary: {
        classified_count: 2,
        unknown_count: 0,
        counts_by_type: {
          'vscode.cc.cli': 1,
          'vscode.cdx.cli': 1,
          'vscode.cc.ide-panel': 0,
          'vscode.cdx.ide-panel': 0,
          'claude-desktop.cc': 0,
          'codex-app-win.cdx': 0,
          'terminal.cc': 0,
          'terminal.cdx': 0,
          unknown: 0,
        },
        counts_by_provenance: {
          launch_stamped: 2,
          runtime_observed: 0,
          configured: 0,
          inferred: 0,
          unknown: 0,
        },
      },
      hook_audit_summary: {
        state: 'not_configured',
        record_count: 0,
        allow_count: 0,
        warn_count: 0,
        block_count: 0,
        error_count: 0,
      },
      local_host_outbox_backlog: { files: 0, events: 2, bytes: 0 },
      app_runtime: { runtime_enabled: true, host: 'JON', runtime_root: 'E:/writing-system' },
      stream_bridge: { state: 'connected', client_count: 1, last_error: null },
    };
    const initialIdentitiesFixture = {
      summary: {
        active_count: 1,
        stale_count: 1,
        host_count: 2,
        family_counts: { cdx: 1, cc: 1 },
        session_classification_counts: {
          'vscode.cc.cli': 1,
          'vscode.cdx.cli': 1,
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
          launch_stamped: 2,
          runtime_observed: 0,
          configured: 0,
          inferred: 0,
          unknown: 0,
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
          lease_identity: 'cc',
          identity: 'cc',
          host: 'BUDDY',
          family: 'cc',
          session_agent_id: 'buddy-terminal',
          claimed_at: '2026-04-11T11:00:00Z',
          last_heartbeat_at: '2026-04-11T11:10:00Z',
          expires_at: '2026-04-11T11:12:00Z',
          stale: true,
          revision: 7,
          session_classification: {
            key: 'vscode.cc.cli',
            display_label: 'VS Code | CC CLI',
            container_host: 'vscode',
            interaction_surface: 'cli',
            runtime_product: 'cc',
            classified: true,
            registry_version: 1,
            reason: 'matched host shell',
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
    const refreshedIdentitiesFixture = {
      ...initialIdentitiesFixture,
      identities: [
        initialIdentitiesFixture.identities[0],
        {
          ...initialIdentitiesFixture.identities[1],
          last_heartbeat_at: '2026-04-11T11:15:00Z',
          expires_at: '2026-04-11T11:17:00Z',
          revision: 8,
          session_classification: {
            ...initialIdentitiesFixture.identities[1].session_classification,
            reason: 'selection persisted after refetch',
          },
        },
      ],
    };
    const discussionsFixture = {
      summary: { thread_count: 0, pending_count: 0, stale_count: 0, workspace_bound_count: 0 },
      discussions: [],
    };

    useCoordinationStatusQueryMock.mockReturnValue(createQueryResult({ data: statusFixture }));
    useCoordinationIdentitiesQueryMock.mockReturnValue(createQueryResult({ data: initialIdentitiesFixture }));
    useCoordinationDiscussionsQueryMock.mockReturnValue(createQueryResult({ data: discussionsFixture }));
    platformApiFetchMock.mockResolvedValue(eventStreamResponse([]));

    const { Component } = await importPage();
    const { rerender } = await renderRuntimePage();

    expect((await screen.findAllByText('jon-runtime')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /buddy-terminal/i }));

    expect(screen.getAllByText(/CC CLI/i).length).toBeGreaterThan(0);
    expect(screen.getByText('matched host shell')).toBeInTheDocument();
    expect(screen.getByText('BUDDY')).toBeInTheDocument();
    useCoordinationIdentitiesQueryMock.mockReturnValue(createQueryResult({ data: refreshedIdentitiesFixture }));
    rerender(<Component />);

    await waitFor(() => {
      expect(screen.getByText('selection persisted after refetch')).toBeInTheDocument();
    });
  });

  it('exposes pause and clear controls on the event feed', () => {
    const handleTogglePaused = vi.fn();
    const handleClear = vi.fn();

    render(
      <CoordinationEventFeed
        events={[
          {
            event_id: 'evt-1',
            subject: 'coord.tasks.task-1.event.created',
            task_id: 'task-1',
            event_kind: 'created',
            host: 'JON',
            agent_id: 'buddy',
            buffered: false,
            occurred_at: '2026-04-09T12:00:00Z',
            payload: {},
          },
        ]}
        paused={false}
        connectionState="connected"
        error={null}
        onTogglePaused={handleTogglePaused}
        onClear={handleClear}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /pause live feed/i }));
    fireEvent.click(screen.getByRole('button', { name: /clear feed/i }));

    expect(handleTogglePaused).toHaveBeenCalledTimes(1);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
