import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoordinationEventFeed } from '@/components/superuser/CoordinationEventFeed';
import { router } from '@/router';
import { useCoordinationStream } from '@/hooks/useCoordinationStream';

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

type RouteNode = {
  path?: string;
  children?: RouteNode[];
};

function findRoute(routes: RouteNode[], targetPath: string): RouteNode | null {
  for (const route of routes) {
    if (route.path === targetPath) return route;
    if (route.children) {
      const nested = findRoute(route.children, targetPath);
      if (nested) return nested;
    }
  }
  return null;
}

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
    expect(findRoute(router.routes as RouteNode[], 'coordination-runtime')).not.toBeNull();
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

  it('renders explicit disabled state when the backend disables coordination runtime', async () => {
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
