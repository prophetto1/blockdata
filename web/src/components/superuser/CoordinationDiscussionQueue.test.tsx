import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CoordinationDiscussionQueue } from './CoordinationDiscussionQueue';
import type { CoordinationDiscussionResponse } from '@/lib/coordinationApi';

const payload: CoordinationDiscussionResponse = {
  summary: {
    thread_count: 2,
    pending_count: 1,
    stale_count: 1,
    workspace_bound_count: 2,
  },
  discussions: [
    {
      task_id: 'task-1',
      workspace_type: 'research',
      workspace_path: 'E:/writing-system/_collaborate/research/topic-1',
      directional_doc: 'E:/writing-system/_collaborate/research/topic-1/plan.md',
      participants: [{ host: 'JON', agent_id: 'cdx' }],
      pending_recipients: [{ host: 'JON', agent_id: 'cdx2' }],
      last_event_kind: 'response_requested',
      status: 'pending',
      updated_at: '2026-04-11T12:00:00Z',
    },
    {
      task_id: 'task-2',
      workspace_type: 'research',
      workspace_path: 'E:/writing-system/_collaborate/research/topic-2',
      directional_doc: null,
      participants: [{ host: 'JON', agent_id: 'cdx3' }],
      pending_recipients: [],
      last_event_kind: 'stale_warning',
      status: 'stale',
      updated_at: '2026-04-11T12:05:00Z',
    },
  ],
};

afterEach(() => {
  cleanup();
});

describe('CoordinationDiscussionQueue', () => {
  it('renders an explicit loading state when discussion data is still pending', () => {
    render(<CoordinationDiscussionQueue data={null} loading />);

    expect(screen.getByText('Loading discussion threads...')).toBeInTheDocument();
    expect(screen.getAllByText('Loading...')).toHaveLength(3);
  });

  it('renders discussion rows with workspace routing state and summary counts', () => {
    render(<CoordinationDiscussionQueue data={payload} loading={false} />);

    expect(screen.getByTestId('coordination-discussion-queue')).toBeInTheDocument();
    expect(screen.getByText('Discussion Queue')).toBeInTheDocument();
    expect(screen.getByText('2 threads')).toBeInTheDocument();
    expect(screen.getByText('1 pending')).toBeInTheDocument();
    expect(screen.getByText('1 stale')).toBeInTheDocument();
    expect(screen.getByText('task-1')).toBeInTheDocument();
    expect(screen.getByText('task-2')).toBeInTheDocument();
    expect(screen.getByText('response_requested')).toBeInTheDocument();
    expect(screen.getByText('stale_warning')).toBeInTheDocument();
    expect(screen.getByText('cdx2')).toBeInTheDocument();
    expect(screen.getAllByTestId('coordination-discussion-row')).toHaveLength(2);
  });

  it('renders an explicit empty state when no discussion threads are present', () => {
    render(
      <CoordinationDiscussionQueue
        data={{
          summary: {
            thread_count: 0,
            pending_count: 0,
            stale_count: 0,
            workspace_bound_count: 0,
          },
          discussions: [],
        }}
        loading={false}
      />,
    );

    expect(screen.getByText('No discussion threads are currently projected.')).toBeInTheDocument();
  });

  it('treats null data as an empty state once loading completes', () => {
    render(<CoordinationDiscussionQueue data={null} loading={false} />);

    expect(screen.getByText('0 threads')).toBeInTheDocument();
    expect(screen.getByText('0 pending')).toBeInTheDocument();
    expect(screen.getByText('0 stale')).toBeInTheDocument();
    expect(screen.getByText('No discussion threads are currently projected.')).toBeInTheDocument();
  });
});
