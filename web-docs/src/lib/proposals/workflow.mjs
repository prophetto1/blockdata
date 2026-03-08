import { basename } from 'node:path';

export const PROPOSAL_STATUSES = [
  'draft',
  'submitted',
  'conditional-accept',
  'accepted',
  'rejected',
];

const PROPOSAL_TRANSITIONS = {
  draft: new Set(['draft', 'submitted']),
  submitted: new Set(['submitted', 'conditional-accept', 'accepted', 'rejected']),
  'conditional-accept': new Set(['conditional-accept', 'accepted', 'rejected']),
  accepted: new Set(['accepted']),
  rejected: new Set(['rejected']),
};

function toDateString(value) {
  return new Date(value).toISOString().slice(0, 10);
}

export function formatStatusLabel(status) {
  return status
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function slugToTitle(slug) {
  return slug
    .replace(/^[0-9]{4}-[0-9]{2}-[0-9]{2}-/, '')
    .replace(/\.[^.]+$/, '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function frontmatterValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const normalized = String(value).replace(/\r\n/g, '\n').trim();
  if (normalized === '') {
    return '';
  }

  if (/^[A-Za-z0-9_.:/ -]+$/.test(normalized) && !normalized.startsWith('#')) {
    return normalized;
  }

  return JSON.stringify(normalized);
}

function parseFrontmatter(rawSource) {
  const source = rawSource.replace(/\r\n/g, '\n');
  if (!source.startsWith('---\n')) {
    return { metadata: {}, body: source.trimStart() };
  }

  const endIndex = source.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    return { metadata: {}, body: source.trimStart() };
  }

  const rawMetadata = source.slice(4, endIndex);
  const body = source.slice(endIndex + 5).replace(/^\n+/, '');
  const metadata = {};

  for (const line of rawMetadata.split('\n')) {
    if (!line.includes(':')) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    metadata[key] = value;
  }

  return { metadata, body };
}

function normalizeProposalMetadata(metadata, body, { filename, now, source } = {}) {
  const defaults = defaultMetadata(
    body,
    filename ?? 'untitled-proposal.md',
    now ?? new Date().toISOString(),
    source,
  );
  const normalized = {
    ...defaults,
    ...metadata,
  };

  if (!PROPOSAL_STATUSES.includes(normalized.status)) {
    normalized.status = 'draft';
  }

  return normalized;
}

function serializeProposalDocument(metadata, body) {
  const orderedKeys = [
    'title',
    'description',
    'status',
    'author',
    'createdAt',
    'updatedAt',
    'source',
    'proposalId',
    'reviewedBy',
    'reviewedAt',
    'decisionNotes',
  ];

  const frontmatter = orderedKeys
    .map((key) => `${key}: ${frontmatterValue(metadata[key])}`)
    .join('\n');

  const normalizedBody = body.replace(/\r\n/g, '\n').trim();

  return `---\n${frontmatter}\n---\n\n${normalizedBody}\n`;
}

function deriveTitle(body, filename) {
  const headingMatch = body.match(/^#\s+(.+)$/m);
  return headingMatch?.[1]?.trim() || slugToTitle(filename);
}

function defaultMetadata(body, filename, now, sourceLabel) {
  const isoDate = toDateString(now);
  const safeFilename = basename(filename);
  const proposalId = safeFilename.replace(/\.[^.]+$/, '');

  return {
    title: deriveTitle(body, safeFilename),
    description: '',
    status: 'draft',
    author: '',
    createdAt: isoDate,
    updatedAt: isoDate,
    source: sourceLabel ?? 'manual',
    proposalId,
    reviewedBy: '',
    reviewedAt: '',
    decisionNotes: '',
  };
}

export function parseProposalDocument(rawSource, options = {}) {
  const { metadata, body } = parseFrontmatter(rawSource);

  return {
    metadata: normalizeProposalMetadata(metadata, body, options),
    body,
  };
}

function validateProposalStatusTransition(currentStatus, nextStatus) {
  if (!PROPOSAL_STATUSES.includes(currentStatus) || !PROPOSAL_STATUSES.includes(nextStatus)) {
    return false;
  }

  return PROPOSAL_TRANSITIONS[currentStatus].has(nextStatus);
}

function canAppendAssessment(currentStatus, nextStatus, note = '') {
  return validateProposalStatusTransition(currentStatus, nextStatus) && note.trim() !== '';
}

export function normalizeProposalSource(rawSource, { filename, now = new Date().toISOString(), source } = {}) {
  const { metadata: normalized, body } = parseProposalDocument(rawSource, {
    filename,
    now,
    source,
  });

  return serializeProposalDocument(normalized, body);
}

function appendAssessment(body, note, status, decidedAt) {
  const trimmedNote = note.trim();
  if (!trimmedNote) {
    return body.trim();
  }

  const heading = `### ${toDateString(decidedAt)} - ${formatStatusLabel(status)}`;
  const normalizedBody = body.trim();
  const assessmentBlock = `${heading}\n\n${trimmedNote}`;

  if (normalizedBody.includes('\n## Editorial Assessment\n')) {
    return `${normalizedBody}\n\n${assessmentBlock}`;
  }

  return `${normalizedBody}\n\n## Editorial Assessment\n\n${assessmentBlock}`;
}

export function applyProposalReview(rawSource, { status, reviewer, note = '', decidedAt = new Date().toISOString() }) {
  if (!PROPOSAL_STATUSES.includes(status)) {
    throw new Error(`Unsupported proposal status: ${status}`);
  }

  const { metadata, body } = parseProposalDocument(rawSource, { now: decidedAt });
  if (!validateProposalStatusTransition(metadata.status, status)) {
    throw new Error(`Invalid proposal status transition: ${metadata.status} -> ${status}`);
  }

  const trimmedNote = note.trim();

  const nextMetadata = {
    ...metadata,
    status,
    reviewedBy: reviewer?.trim() ?? '',
    reviewedAt: decidedAt,
    updatedAt: toDateString(decidedAt),
    decisionNotes: trimmedNote.replace(/\s+/g, ' '),
  };

  const nextBody = canAppendAssessment(metadata.status, status, trimmedNote)
    ? appendAssessment(body, trimmedNote, status, decidedAt)
    : body.trim();

  return serializeProposalDocument(nextMetadata, nextBody);
}

export function getProposalSummary(modulePath, frontmatter = {}) {
  const filename = basename(modulePath);
  const title = frontmatter.title || slugToTitle(filename);
  const status = PROPOSAL_STATUSES.includes(frontmatter.status) ? frontmatter.status : 'draft';

  return {
    filename,
    slug: filename.replace(/\.[^.]+$/, ''),
    title,
    description: frontmatter.description || 'No description yet.',
    status,
    updatedAt: frontmatter.updatedAt || frontmatter.createdAt || '',
    author: frontmatter.author || '',
    source: frontmatter.source || 'manual',
    reviewedBy: frontmatter.reviewedBy || '',
  };
}
