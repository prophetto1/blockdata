import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ParseConfigColumn } from './ParseConfigColumn';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const baseDoc: ProjectDocumentRow = {
  source_uid: 'source-1',
  owner_id: 'owner-1',
  conv_uid: 'conv-1',
  project_id: 'project-1',
  source_type: 'py',
  source_filesize: 1234,
  source_total_characters: null,
  doc_title: 'worker.py',
  status: 'uploaded',
  uploaded_at: '2026-03-17T00:00:00.000Z',
  error: null,
  source_locator: 'projects/project-1/source/worker.py',
  conv_locator: null,
  pipeline_config: null,
  requested_pipeline_config: null,
  applied_pipeline_config: null,
  parser_runtime_meta: null,
  conv_total_blocks: null,
  conv_parsing_tool: null,
};

function makeParseTabMock(overrides: Record<string, unknown> = {}) {
  return {
    profiles: [
      { id: 'docling-1', parser: 'docling', config: { name: 'Docling Standard' } },
      { id: 'tree-1', parser: 'tree_sitter', config: { name: 'Tree-sitter Standard' } },
      { id: 'tree-2', parser: 'tree_sitter', config: { name: 'Symbols Only' } },
    ],
    selectedProfileId: 'docling-1',
    selectedParser: 'docling',
    handleProfileChange: vi.fn(),
    batch: {
      isRunning: false,
      progress: { errors: 0 },
      cancel: vi.fn(),
      start: vi.fn(),
      retryFailed: vi.fn(),
    },
    jsonModal: null,
    setJsonModal: vi.fn(),
    handleViewJson: vi.fn(),
    handleDownloadJson: vi.fn(),
    ...overrides,
  };
}

describe('ParseConfigColumn', () => {
  it('filters active profiles to the selected document parser track', () => {
    const parseTab = makeParseTabMock();

    render(
      <ParseConfigColumn
        docs={[baseDoc]}
        trackDocs={[baseDoc]}
        selected={new Set()}
        selectedDoc={baseDoc}
        parseTab={parseTab as never}
      />,
    );

    const options = Array.from(screen.getAllByRole('option')).map((node) => node.textContent?.trim());
    expect(options).toEqual(['Tree-sitter Standard', 'Symbols Only']);
  });

  it('shows the applied profile as read-only for already parsed documents', () => {
    const parsedDoc: ProjectDocumentRow = {
      ...baseDoc,
      status: 'parsed',
      requested_pipeline_config: {
        _profile_id: 'tree-1',
        _profile_name: 'Tree-sitter Standard',
        name: 'Tree-sitter Standard',
      },
      applied_pipeline_config: {
        _profile_id: 'tree-1',
        _profile_name: 'Tree-sitter Standard',
        name: 'Tree-sitter Standard',
      },
      pipeline_config: {
        _profile_id: 'tree-1',
        _profile_name: 'Tree-sitter Standard',
        name: 'Tree-sitter Standard',
      },
      conv_parsing_tool: 'tree_sitter',
    };

    const parseTab = makeParseTabMock({
      selectedProfileId: 'tree-1',
      selectedParser: 'tree_sitter',
    });

    render(
      <ParseConfigColumn
        docs={[parsedDoc]}
        trackDocs={[parsedDoc]}
        selected={new Set()}
        selectedDoc={parsedDoc}
        parseTab={parseTab as never}
      />,
    );

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('Parsed with')).toBeInTheDocument();
    expect(screen.getByText('Tree-sitter Standard')).toBeInTheDocument();
  });
});
