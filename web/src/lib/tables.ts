// Single source of truth for table names.
export const TABLES = {
  projects: 'projects',
  documents: 'documents_view',        // read-only view joining source_documents + conversion_parsing
  sourceDocuments: 'source_documents', // write target + realtime subscription
  conversionParsing: 'conversion_parsing',
  conversionRepresentations: 'conversion_representations',
  blocks: 'blocks',
  schemas: 'schemas',
  runs: 'runs',
  overlays: 'block_overlays',
  profiles: 'profiles',
  userApiKeys: 'user_api_keys',
} as const;
