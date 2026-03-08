import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  applyProposalReview,
  getProposalSummary,
  normalizeProposalSource,
  parseProposalDocument,
  PROPOSAL_STATUSES,
} from './workflow.mjs';

function resolveRootDir(rootDir) {
  return rootDir instanceof URL ? fileURLToPath(rootDir) : resolve(String(rootDir));
}

function assertValidProposalFilename(filename) {
  const safeFilename = basename(String(filename ?? ''));

  if (!safeFilename || !['.md', '.mdx'].includes(extname(safeFilename).toLowerCase())) {
    throw new Error('Invalid proposal filename.');
  }

  return safeFilename;
}

function resolveProposalPath(rootDir, filename) {
  const resolvedRootDir = resolveRootDir(rootDir);
  const safeFilename = assertValidProposalFilename(filename);
  const filePath = resolve(resolvedRootDir, safeFilename);

  if (!filePath.startsWith(resolvedRootDir)) {
    throw new Error('Invalid proposal path.');
  }

  return {
    rootDir: resolvedRootDir,
    filename: safeFilename,
    filePath,
  };
}

export async function listProposals({ rootDir }) {
  const resolvedRootDir = resolveRootDir(rootDir);
  const entries = await readdir(resolvedRootDir, { withFileTypes: true });
  const proposalFiles = entries.filter(
    (entry) => entry.isFile() && ['.md', '.mdx'].includes(extname(entry.name).toLowerCase()),
  );

  const proposals = await Promise.all(
    proposalFiles.map(async (entry) => {
      const source = await readFile(resolve(resolvedRootDir, entry.name), 'utf8');
      const { metadata } = parseProposalDocument(source, { filename: entry.name });
      return getProposalSummary(entry.name, metadata);
    }),
  );

  return proposals.sort((left, right) => {
    const rightDate = right.updatedAt || right.filename;
    const leftDate = left.updatedAt || left.filename;
    return rightDate.localeCompare(leftDate);
  });
}

export async function readProposal({ rootDir, filename }) {
  const resolved = resolveProposalPath(rootDir, filename);
  const source = await readFile(resolved.filePath, 'utf8');
  const { metadata, body } = parseProposalDocument(source, { filename: resolved.filename });

  return {
    ...getProposalSummary(resolved.filename, metadata),
    metadata,
    body,
  };
}

export async function normalizeProposalFile({ rootDir, filename }) {
  const resolved = resolveProposalPath(rootDir, filename);
  const source = await readFile(resolved.filePath, 'utf8');
  const normalized = normalizeProposalSource(source, {
    filename: resolved.filename,
    source: source.startsWith('---\n') ? undefined : 'ai',
  });
  const changed = normalized !== source.replace(/\r\n/g, '\n');

  if (changed) {
    await writeFile(resolved.filePath, normalized, 'utf8');
  }

  return {
    filename: resolved.filename,
    changed,
  };
}

export async function writeProposalReview({
  rootDir,
  filename,
  reviewer,
  status,
  note = '',
  expectedUpdatedAt,
}) {
  const resolved = resolveProposalPath(rootDir, filename);
  const safeStatus = String(status ?? '').trim();

  if (!reviewer?.trim()) {
    throw new Error('Reviewer is required.');
  }

  if (!PROPOSAL_STATUSES.includes(safeStatus)) {
    throw new Error('Invalid proposal status.');
  }

  const currentSource = await readFile(resolved.filePath, 'utf8');
  const currentProposal = parseProposalDocument(currentSource, { filename: resolved.filename });

  if (
    expectedUpdatedAt &&
    currentProposal.metadata.updatedAt &&
    currentProposal.metadata.updatedAt !== expectedUpdatedAt
  ) {
    const error = new Error('Proposal has changed since it was loaded.');
    error.code = 'PROPOSAL_CONFLICT';
    throw error;
  }

  const nextSource = applyProposalReview(currentSource, {
    status: safeStatus,
    reviewer,
    note,
    decidedAt: new Date().toISOString(),
  });

  await writeFile(resolved.filePath, nextSource, 'utf8');
  return readProposal({ rootDir: resolved.rootDir, filename: resolved.filename });
}
