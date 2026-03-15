import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BlockViewerGridRDG } from './BlockViewerGridRDG';

const mockLoadDocumentViewMode = vi.fn();
const mockUseBlocks = vi.fn();
const mockUseBlockTypeRegistry = vi.fn();
const mockUseOverlays = vi.fn();

vi.mock('react-data-grid', () => ({
  DataGrid: ({ columns, rows }: { columns: Array<Record<string, unknown>>; rows: Array<Record<string, unknown>> }) => (
    <div data-testid="mock-grid">
      {rows.map((row) => (
        <div key={String(row.block_uid)}>
          {columns
            .filter((column) => typeof column.key === 'string' && column.key !== '_rdg_resize_spacer')
            .map((column) => (
              <div key={String(column.key)} data-testid={`cell-${String(column.key)}`}>
                {'renderCell' in column && typeof column.renderCell === 'function'
                  ? column.renderCell({ row, column })
                  : String(row[String(column.key)] ?? '')}
              </div>
            ))}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/hooks/useBlocks', () => ({
  useBlocks: (...args: unknown[]) => mockUseBlocks(...args),
}));

vi.mock('@/hooks/useBlockTypeRegistry', () => ({
  useBlockTypeRegistry: () => mockUseBlockTypeRegistry(),
}));

vi.mock('@/hooks/useOverlays', () => ({
  useOverlays: (...args: unknown[]) => mockUseOverlays(...args),
}));

vi.mock('@/pages/superuser/documentViews', async () => {
  const actual = await vi.importActual<typeof import('@/pages/superuser/documentViews')>('@/pages/superuser/documentViews');
  return {
    ...actual,
    loadDocumentViewMode: () => mockLoadDocumentViewMode(),
  };
});

describe('BlockViewerGridRDG admin-controlled representation mode', () => {
  beforeEach(() => {
    localStorage.clear();
    const resizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    vi.stubGlobal('ResizeObserver', resizeObserver);
    mockUseBlocks.mockReturnValue({
      blocks: [
        {
          block_uid: 'block-1',
          conv_uid: 'conv-1',
          block_index: 0,
          block_type: 'heading',
          block_locator: {
            type: 'docling_json_pointer',
            parser_block_type: 'title',
            parser_path: '#/texts/0',
            page_no: 1,
          },
          block_content: 'Quarterly Review',
        },
      ],
      totalCount: 1,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseBlockTypeRegistry.mockReturnValue({ registry: { badgeColor: {} } });
    mockUseOverlays.mockReturnValue({
      overlayMap: new Map(),
      loading: false,
      error: null,
      refetch: vi.fn(),
      patchOverlay: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('collapses the admin normalized mode to docling-native display and ignores stale local block view state', async () => {
    localStorage.setItem('blockdata-type-view', 'parser_native');
    mockLoadDocumentViewMode.mockResolvedValue('normalized');

    render(<BlockViewerGridRDG convUid="conv-1" selectedRunId={null} selectedRun={null} />);

    await waitFor(() => {
      expect(screen.getByText('Docling Native')).toBeInTheDocument();
    });

    expect(screen.getAllByText('title').length).toBeGreaterThan(0);
    expect(screen.getByText('#/texts/0')).toBeInTheDocument();
    expect(localStorage.getItem('blockdata-type-view')).toBeNull();
  });

  it('uses the admin raw docling mode across the visible type and parser columns', async () => {
    localStorage.setItem('blockdata-type-view', 'normalized');
    mockLoadDocumentViewMode.mockResolvedValue('raw_docling');

    render(<BlockViewerGridRDG convUid="conv-1" selectedRunId={null} selectedRun={null} />);

    await waitFor(() => {
      expect(screen.getByText('Docling Native')).toBeInTheDocument();
    });

    expect(screen.getAllByText('title').length).toBeGreaterThan(0);
    expect(screen.getByText('#/texts/0')).toBeInTheDocument();
    expect(localStorage.getItem('blockdata-type-view')).toBeNull();
  });
});
