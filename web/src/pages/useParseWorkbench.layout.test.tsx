import { describe, expect, it } from 'vitest';

import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { getParseWorkbenchLayout } from './useParseWorkbench';

const baseDoc: ProjectDocumentRow = {
  source_uid: 'source-1',
  owner_id: 'owner-1',
  conv_uid: 'conv-1',
  project_id: 'project-1',
  source_type: 'py',
  source_filesize: 1234,
  source_total_characters: null,
  doc_title: 'worker.py',
  status: 'parsed',
  uploaded_at: '2026-03-17T00:00:00.000Z',
  error: null,
  source_locator: 'projects/project-1/source/worker.py',
  conv_locator: null,
  pipeline_config: {
    _profile_id: 'tree-1',
    _profile_name: 'Tree-sitter Standard',
    name: 'Tree-sitter Standard',
  },
  requested_pipeline_config: null,
  applied_pipeline_config: null,
  parser_runtime_meta: null,
  conv_total_blocks: null,
  conv_parsing_tool: 'tree_sitter',
};

describe('getParseWorkbenchLayout', () => {
  it('uses tree-sitter tabs for parsed code documents', () => {
    const layout = getParseWorkbenchLayout(baseDoc);
    const tabIds = layout.tabs.map((tab) => tab.id);

    expect(tabIds).toContain('ts-ast');
    expect(tabIds).toContain('ts-symbols');
    expect(tabIds).not.toContain('docling-md');
  });
});
