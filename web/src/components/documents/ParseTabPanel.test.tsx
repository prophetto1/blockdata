import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveSignedUrlForLocatorsMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/hooks/useBatchParse', () => ({
  useBatchParse: () => ({
    queueStatus: 'idle',
  }),
}));

vi.mock('@/lib/projectDetailHelpers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/projectDetailHelpers')>(
    '@/lib/projectDetailHelpers',
  );
  return {
    ...actual,
    resolveSignedUrlForLocators: (...args: unknown[]) => resolveSignedUrlForLocatorsMock(...args),
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { useParseTab } from './ParseTabPanel';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

const baseDoc: ProjectDocumentRow = {
  source_uid: 'source-1',
  owner_id: 'owner-1',
  conv_uid: 'conv-1',
  project_id: 'project-1',
  source_type: 'md',
  source_filesize: 123,
  source_total_characters: null,
  doc_title: 'Guide.md',
  status: 'parsed',
  uploaded_at: '2026-03-10T00:00:00.000Z',
  error: null,
  source_locator: 'users/user-1/assets/projects/project-1/sources/source-1/source/guide.md',
  conv_locator: 'users/user-1/projects/project-1/sources/source-1/converted/guide.docling.json',
};

describe('useParseTab signed URL resolution', () => {
  beforeEach(() => {
    resolveSignedUrlForLocatorsMock.mockReset();
    fromMock.mockReset();
    fromMock.mockImplementation((table: string) => {
      expect(table).toBe('parsing_profiles');
      return {
        select: () => ({
          order: () => Promise.resolve({
            data: [
              {
                id: 'default',
                parser: 'docling',
                config: { is_default: true },
              },
            ],
          }),
        }),
      };
    });
  });

  it('uses the shared resolver when viewing JSON parse output', async () => {
    resolveSignedUrlForLocatorsMock.mockResolvedValue({
      url: 'https://gcs.test/guide.docling.json',
      error: null,
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"hello":"world"}', { status: 200 }),
    );

    const { result } = renderHook(() => useParseTab('docling', baseDoc));

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.handleViewJson(baseDoc);
    });

    expect(resolveSignedUrlForLocatorsMock).toHaveBeenCalledWith([baseDoc.conv_locator]);
    expect(result.current.jsonModal).toEqual({
      title: 'Guide.md',
      content: '{\n  "hello": "world"\n}',
    });

    fetchSpy.mockRestore();
  });

  it('uses the shared resolver when downloading JSON parse output', async () => {
    resolveSignedUrlForLocatorsMock.mockResolvedValue({
      url: 'https://legacy.test/guide.docling.json',
      error: null,
    });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const { result } = renderHook(() => useParseTab('docling', baseDoc));

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.handleDownloadJson(baseDoc);
    });

    expect(resolveSignedUrlForLocatorsMock).toHaveBeenCalledWith([baseDoc.conv_locator]);
    expect(openSpy).toHaveBeenCalledWith('https://legacy.test/guide.docling.json', '_blank');

    openSpy.mockRestore();
  });
});
