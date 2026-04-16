import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const edgeFetchMock = vi.fn();
const platformApiFetchMock = vi.fn();

vi.mock('@/lib/edge', () => ({
  edgeFetch: (...args: unknown[]) => edgeFetchMock(...args),
}));

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

import { ParseEasyPanel } from './ParseEasyPanel';

Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  value: ResizeObserverMock,
  writable: true,
});

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

Object.defineProperty(window, 'IntersectionObserver', {
  value: IntersectionObserverMock,
  writable: true,
});

describe('ParseEasyPanel', () => {
  beforeEach(() => {
    edgeFetchMock.mockReset();
    platformApiFetchMock.mockReset();
  });

  it('routes direct docling parse runs through Platform API /parse', async () => {
    platformApiFetchMock.mockResolvedValue(new Response('', { status: 202 }));
    const onParseQueued = vi.fn();

    render(
      <ParseEasyPanel
        projectId="project-1"
        selectedDocument={{
          source_uid: 'source-1',
          source_type: 'pdf',
          status: 'uploaded',
          doc_title: 'Outline.pdf',
        }}
        onParseQueued={onParseQueued}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run parse' }));

    await waitFor(() => {
      expect(platformApiFetchMock).toHaveBeenCalledWith('/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_uid: 'source-1' }),
      });
    });

    expect(edgeFetchMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(onParseQueued).toHaveBeenCalledTimes(1);
    });
  });
});
