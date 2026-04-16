import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const edgeFetchMock = vi.fn();
const platformApiFetchMock = vi.fn();

vi.mock('@/lib/edge', () => ({
  edgeFetch: (...args: unknown[]) => edgeFetchMock(...args),
}));

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

import { useBatchParse } from './useBatchParse';

describe('useBatchParse', () => {
  beforeEach(() => {
    edgeFetchMock.mockReset();
    platformApiFetchMock.mockReset();
  });

  it('routes docling dispatch through Platform API /parse', async () => {
    platformApiFetchMock.mockResolvedValue(new Response('', { status: 202 }));

    const { result } = renderHook(() => useBatchParse({
      profileId: 'profile-1',
      pipelineConfig: { tier: 'agentic' },
      parser: 'docling',
      concurrency: 1,
    }));

    act(() => {
      result.current.start(['source-1']);
    });

    await waitFor(() => {
      expect(platformApiFetchMock).toHaveBeenCalledWith('/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_uid: 'source-1',
          profile_id: 'profile-1',
          pipeline_config: { tier: 'agentic' },
        }),
      });
    });

    expect(edgeFetchMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.dispatchStatus.get('source-1')).toBe('dispatched');
    });
  });
});
