import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

export type ParseTrack = 'docling' | 'tree_sitter';

export type ParsingProfileOption = {
  id: string;
  parser: string;
  config: Record<string, unknown>;
};

const CODE_SOURCE_TYPES = new Set([
  'java',
  'py',
  'js',
  'jsx',
  'ts',
  'tsx',
  'go',
  'rs',
  'cs',
]);

function readProfileValue(
  config: Record<string, unknown> | null | undefined,
  key: '_profile_id' | '_profile_name' | 'name',
): string | null {
  const value = config?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function getConfigCandidates(doc: ProjectDocumentRow): Array<Record<string, unknown> | null | undefined> {
  return [
    doc.applied_pipeline_config,
    doc.requested_pipeline_config,
    doc.pipeline_config,
  ];
}

const DOCLING_SOURCE_TYPES = new Set([
  'md', 'docx', 'pdf', 'pptx', 'xlsx', 'html', 'csv', 'txt',
  'rst', 'latex', 'odt', 'epub', 'rtf', 'org', 'asciidoc', 'vtt',
]);

export function filterDocsByTrack(
  docs: ProjectDocumentRow[],
  track: ParseTrack,
): ProjectDocumentRow[] {
  return docs.filter((doc) => getDocumentParseTrack(doc) === track);
}

export function isParseSupported(doc: Pick<ProjectDocumentRow, 'source_type'>): boolean {
  return CODE_SOURCE_TYPES.has(doc.source_type) || DOCLING_SOURCE_TYPES.has(doc.source_type);
}

export function getDocumentParseTrack(doc: Pick<ProjectDocumentRow, 'source_type' | 'conv_parsing_tool'> | null | undefined): ParseTrack {
  if (doc?.conv_parsing_tool === 'tree_sitter') return 'tree_sitter';
  if (doc?.conv_parsing_tool === 'docling') return 'docling';
  if (!doc) return 'docling';
  return CODE_SOURCE_TYPES.has(doc.source_type) ? 'tree_sitter' : 'docling';
}

export function getCompatibleProfiles(
  profiles: ParsingProfileOption[],
  doc: Pick<ProjectDocumentRow, 'source_type' | 'conv_parsing_tool'> | null | undefined,
): ParsingProfileOption[] {
  if (!doc) return profiles;
  const track = getDocumentParseTrack(doc);
  return profiles.filter((profile) => profile.parser === track);
}

export function getAppliedProfileName(doc: ProjectDocumentRow | null | undefined): string | null {
  if (!doc) return null;
  for (const config of getConfigCandidates(doc)) {
    const explicitName = readProfileValue(config, '_profile_name');
    if (explicitName) return explicitName;
    const fallbackName = readProfileValue(config, 'name');
    if (fallbackName) return fallbackName;
  }
  return null;
}

export function getAppliedProfileId(doc: ProjectDocumentRow | null | undefined): string | null {
  if (!doc) return null;
  for (const config of getConfigCandidates(doc)) {
    const id = readProfileValue(config, '_profile_id');
    if (id) return id;
  }
  return null;
}

export function findAppliedProfile(
  profiles: ParsingProfileOption[],
  doc: ProjectDocumentRow | null | undefined,
): ParsingProfileOption | null {
  const appliedId = getAppliedProfileId(doc);
  if (appliedId) {
    const byId = profiles.find((profile) => profile.id === appliedId);
    if (byId) return byId;
  }

  const appliedName = getAppliedProfileName(doc);
  if (appliedName) {
    const byName = profiles.find((profile) => {
      const name = profile.config.name;
      return typeof name === 'string' && name.trim() === appliedName;
    });
    if (byName) return byName;
  }

  return null;
}
