import { watch } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, relative, resolve } from 'node:path';

import YAML from 'yaml';

const SUPPORTED_EXTENSIONS = new Set(['.md', '.mdx']);
const PROPOSAL_STATUSES = new Set([
  'draft',
  'submitted',
  'conditional-accept',
  'accepted',
  'rejected',
]);
const PROPOSAL_KEYS = [
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

function normalizeNewlines(value) {
  return String(value ?? '').replace(/\r\n/g, '\n');
}

function filenameStem(filePath) {
  const safeName = basename(filePath);
  return safeName.replace(/\.[^.]+$/, '');
}

function isSupportedDocsPath(filePath) {
  return SUPPORTED_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function isProposalPath(relativePath) {
  return normalizePath(relativePath).split('/').includes('proposals');
}

function normalizePath(filePath) {
  return String(filePath ?? '').replace(/\\/g, '/');
}

function parseScalarValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFallbackFrontmatter(source) {
  const metadata = {};

  for (const line of source.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    metadata[match[1]] = parseScalarValue(match[2]);
  }

  return metadata;
}

function parseFrontmatterData(source) {
  const raw = normalizeNewlines(source).trim();
  if (!raw) return {};

  try {
    const parsed = YAML.parse(raw) ?? {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return parseFallbackFrontmatter(raw);
  }

  return {};
}

function isClosingFence(line) {
  return line === '---' || line.startsWith('---#') || line.startsWith('--- #');
}

function extractFrontmatter(rawSource) {
  const source = normalizeNewlines(rawSource);
  if (!source.startsWith('---\n')) {
    return {
      metadata: {},
      body: source,
      hadFrontmatter: false,
    };
  }

  const lines = source.split('\n');
  let closingIndex = -1;

  for (let index = 1; index < lines.length; index += 1) {
    if (isClosingFence(lines[index])) {
      closingIndex = index;
      break;
    }
  }

  if (closingIndex === -1) {
    return {
      metadata: {},
      body: source,
      hadFrontmatter: false,
    };
  }

  const metadataSource = lines.slice(1, closingIndex).join('\n');
  const trailing = lines[closingIndex].slice(3).trimStart();
  const bodyLines = [];

  if (trailing) {
    bodyLines.push(trailing);
  }

  bodyLines.push(...lines.slice(closingIndex + 1));

  return {
    metadata: parseFrontmatterData(metadataSource),
    body: bodyLines.join('\n'),
    hadFrontmatter: true,
  };
}

function inferProposalDate(stem, now) {
  const stemMatch = stem.match(/^(\d{4}-\d{2}-\d{2})(?:-|$)/);
  if (stemMatch) return stemMatch[1];
  return new Date(now).toISOString().slice(0, 10);
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function applyProposalMetadata(metadata, stem, now) {
  const next = { ...metadata };
  const createdAt = asString(next.createdAt).trim() || inferProposalDate(stem, now);

  next.status = PROPOSAL_STATUSES.has(next.status) ? next.status : 'draft';
  next.author = asString(next.author);
  next.createdAt = createdAt;
  next.updatedAt = asString(next.updatedAt).trim() || createdAt;
  next.source = asString(next.source).trim() || 'manual';
  next.proposalId = asString(next.proposalId).trim() || stem;
  next.reviewedBy = asString(next.reviewedBy);
  next.reviewedAt = asString(next.reviewedAt);
  next.decisionNotes = asString(next.decisionNotes);

  return next;
}

function stripLeadingTitleHeading(body) {
  let next = normalizeNewlines(body).replace(/^\uFEFF/, '').replace(/^\n+/, '');
  if (!next.startsWith('# ')) {
    return next.replace(/\n+$/, '');
  }

  const headingMatch = next.match(/^#\s+[^\n]+(?:\n+|$)/);
  if (!headingMatch) {
    return next.replace(/\n+$/, '');
  }

  next = next.slice(headingMatch[0].length);
  return next.replace(/^\n+/, '').replace(/\n+$/, '');
}

function orderedMetadata(metadata, { proposal }) {
  const ordered = {};
  const seen = new Set();

  function push(key) {
    if (seen.has(key) || !(key in metadata)) return;
    ordered[key] = metadata[key];
    seen.add(key);
  }

  push('title');
  push('description');

  if (proposal) {
    for (const key of PROPOSAL_KEYS) {
      push(key);
    }
  }

  for (const key of Object.keys(metadata)) {
    push(key);
  }

  return ordered;
}

function stringifyFrontmatter(metadata) {
  return YAML.stringify(metadata, {
    lineWidth: 0,
    minContentWidth: 0,
  }).trimEnd();
}

export function normalizeDocsSource(rawSource, { relativePath, now = new Date().toISOString() } = {}) {
  if (!relativePath) {
    throw new Error('relativePath is required.');
  }

  const normalizedRelativePath = normalizePath(relativePath);
  const stem = filenameStem(normalizedRelativePath);
  const proposal = isProposalPath(normalizedRelativePath);
  const { metadata, body } = extractFrontmatter(rawSource);

  let nextMetadata = {
    ...metadata,
    title: stem,
  };

  if (proposal) {
    nextMetadata = applyProposalMetadata(nextMetadata, stem, now);
  }

  const finalMetadata = orderedMetadata(nextMetadata, { proposal });
  const frontmatter = stringifyFrontmatter(finalMetadata);
  const normalizedBody = stripLeadingTitleHeading(body);

  if (normalizedBody) {
    return `---\n${frontmatter}\n---\n\n${normalizedBody}\n`;
  }

  return `---\n${frontmatter}\n---\n`;
}

function resolveInsideRoot(rootDir, filePath) {
  const resolvedRoot = resolve(String(rootDir));
  const resolvedPath = resolve(String(filePath));
  const relativePath = relative(resolvedRoot, resolvedPath);

  if (
    relativePath.startsWith('..') ||
    relativePath.includes(`..\\`) ||
    relativePath.includes('../')
  ) {
    throw new Error('File path must stay inside the docs root.');
  }

  return {
    rootDir: resolvedRoot,
    filePath: resolvedPath,
    relativePath: normalizePath(relativePath),
  };
}

export async function normalizeDocsFile(filePath, { rootDir, relativePath, now } = {}) {
  const resolved = rootDir
    ? resolveInsideRoot(rootDir, filePath)
    : {
        filePath: resolve(String(filePath)),
        relativePath: normalizePath(relativePath ?? basename(filePath)),
      };

  if (!isSupportedDocsPath(resolved.filePath)) {
    return {
      changed: false,
      filePath: resolved.filePath,
      relativePath: resolved.relativePath,
    };
  }

  const source = normalizeNewlines(await readFile(resolved.filePath, 'utf8'));
  const normalized = normalizeDocsSource(source, {
    relativePath: resolved.relativePath,
    now,
  });

  if (normalized === source) {
    return {
      changed: false,
      filePath: resolved.filePath,
      relativePath: resolved.relativePath,
    };
  }

  await writeFile(resolved.filePath, normalized, 'utf8');

  return {
    changed: true,
    filePath: resolved.filePath,
    relativePath: resolved.relativePath,
  };
}

async function listDocsFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listDocsFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && isSupportedDocsPath(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

export async function normalizeDocsTree({ rootDir, now, logger = console } = {}) {
  if (!rootDir) {
    throw new Error('rootDir is required.');
  }

  const files = await listDocsFiles(resolve(String(rootDir)));
  let changed = 0;

  for (const filePath of files) {
    const result = await normalizeDocsFile(filePath, { rootDir, now });
    if (!result.changed) continue;
    changed += 1;
    logger.log(`Normalized ${result.relativePath}`);
  }

  return { changed };
}

export function watchDocsFrontmatter({ rootDir, settleMs = 150, logger = console, now } = {}) {
  if (!rootDir) {
    throw new Error('rootDir is required.');
  }

  const resolvedRoot = resolve(String(rootDir));
  const pending = new Map();

  async function flush(filePath) {
    try {
      const result = await normalizeDocsFile(filePath, {
        rootDir: resolvedRoot,
        now,
      });

      if (result.changed) {
        logger.log(`Normalized ${result.relativePath}`);
      }
    } catch (error) {
      logger.error(`Failed to normalize ${filePath}:`, error);
    }
  }

  function schedule(filePath) {
    if (!isSupportedDocsPath(filePath)) return;

    const existing = pending.get(filePath);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      pending.delete(filePath);
      void flush(filePath);
    }, settleMs);

    pending.set(filePath, timer);
  }

  const watcher = watch(resolvedRoot, { recursive: true }, (_eventType, filename) => {
    if (!filename) return;
    schedule(resolve(resolvedRoot, String(filename)));
  });

  return {
    close() {
      watcher.close();
      for (const timer of pending.values()) {
        clearTimeout(timer);
      }
      pending.clear();
    },
  };
}
