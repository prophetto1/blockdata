// Single source of truth for table names.
// During v2 parallel mode, tables have _v2 suffix.
// After Step 9 cutover, remove _v2 suffixes here.
export const TABLES = {
  documents: 'documents_v2',
  blocks: 'blocks_v2',
  schemas: 'schemas',
  runs: 'runs_v2',
  overlays: 'block_overlays_v2',
} as const;
