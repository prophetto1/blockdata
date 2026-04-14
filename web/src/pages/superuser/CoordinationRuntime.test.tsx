import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoordinationEventFeed } from '@/components/superuser/CoordinationEventFeed';
import { useCoordinationStream } from '@/hooks/useCoordinationStream';
import routerSource from '@/router.tsx?raw';

const platformApiFetchMock = vi.fn();

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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function eventStreamResponse(frames: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(frame));
      }
      controller.close();
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

describe('CoordinationRuntime', () => {
  beforeEach(() => {
    vi.resetModules();
    platformApiFetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('registers the coordination runtime route under superuser', () => {
    expect(routerSource).toContain("path: 'coordination-runtime'");
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

  it(
    'renders explicit disabled state when the backend disables coordination runtime',
    { timeout: 10000 },
    async () => {
    platformApiFetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          detail: {
            code: 'coordination_runtime_disabled',
            message: 'Coordination runtime is disabled',
          },
        },
        503,
      ),
    );

    const { Component } = await importPage();
    render(<Component />);

    expect(await screen.findByTestId('coordination-runtime-disabled')).toHaveTextContent(
      /coordination runtime is disabled/i,
    );
    expect(platformApiFetchMock).toHaveBeenCalledTimes(1);
    expect(platformApiFetchMock).toHaveBeenCalledWith('/admin/runtime/coordination/status');
    },
  );

  it('renders an error alert when the initial runtime status request fails', async () => {
    platformApiFetchMock
      .mockRejectedValueOnce(new Error('Coordination fetch failed'))
      .mockResolvedValue(eventStreamResponse([]));

    const { Component } = await importPage();
    render(<Component />);

    expect(await screen.findByText(/coordination fetch failed/i)).toBeInTheDocument();
  });

  it('loads the status, identity, and discussion operator panels on the runtime page', async () => {
    platformApiFetchMock
      .mockResolvedValueOnce(
        jsonResponse({
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
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
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
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
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
        }),
      )
      .mockResolvedValue(eventStreamResponse([]));

    const { Component } = await importPage();
    render(<Component />);

    expect(await screen.findByTestId('coordination-identity-table')).toBeInTheDocument();
    expect(screen.getByTestId('coordination-session-classification-summary')).toBeInTheDocument();
    expect(screen.getByText('2 classified')).toBeInTheDocument();
    expect(screen.getByText('1 unknown')).toBeInTheDocument();
    expect(screen.getByText('VS Code | CDX CLI')).toBeInTheDocument();
    expect(screen.getByText(/lease cdx/i)).toBeInTheDocument();
    expect(screen.getByTestId('coordination-discussion-queue')).toBeInTheDocument();
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(1, '/admin/runtime/coordination/status');
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      2,
      '/admin/runtime/coordination/identities',
    );
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      3,
      '/admin/runtime/coordination/discussions?status=all&limit=50',
    );
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
