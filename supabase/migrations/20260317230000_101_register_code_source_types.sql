-- Migration 101: Register code source types for tree-sitter
-- The ingest edge function was classifying code files as "binary" because
-- their extensions were missing from both registry_source_types and the
-- SOURCE_TYPE_BY_EXTENSION map in storage.ts. This migration adds the
-- registry rows so the FK constraint on source_documents.source_type is
-- satisfied when the ingest function stores the real extension.

INSERT INTO registry_source_types (source_type, description) VALUES
  ('java', 'Java source code'),
  ('py',   'Python source code'),
  ('js',   'JavaScript source code'),
  ('jsx',  'JSX source code'),
  ('ts',   'TypeScript source code'),
  ('tsx',  'TSX source code'),
  ('go',   'Go source code'),
  ('rs',   'Rust source code'),
  ('cs',   'C# source code')
ON CONFLICT (source_type) DO NOTHING;

-- Fix any existing code files that were uploaded as "binary"
UPDATE source_documents
SET source_type = CASE
  WHEN source_locator LIKE '%.py'   THEN 'py'
  WHEN source_locator LIKE '%.java' THEN 'java'
  WHEN source_locator LIKE '%.js'   THEN 'js'
  WHEN source_locator LIKE '%.jsx'  THEN 'jsx'
  WHEN source_locator LIKE '%.ts'   THEN 'ts'
  WHEN source_locator LIKE '%.tsx'  THEN 'tsx'
  WHEN source_locator LIKE '%.go'   THEN 'go'
  WHEN source_locator LIKE '%.rs'   THEN 'rs'
  WHEN source_locator LIKE '%.cs'   THEN 'cs'
  ELSE source_type
END
WHERE source_type = 'binary'
  AND (
    source_locator LIKE '%.py'
    OR source_locator LIKE '%.java'
    OR source_locator LIKE '%.js'
    OR source_locator LIKE '%.jsx'
    OR source_locator LIKE '%.ts'
    OR source_locator LIKE '%.tsx'
    OR source_locator LIKE '%.go'
    OR source_locator LIKE '%.rs'
    OR source_locator LIKE '%.cs'
  );
