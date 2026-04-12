import fs from 'node:fs/promises';
import path from 'node:path';

import {
  CoordinationUnavailableError,
  DEFAULT_OUTBOX_MAX_BYTES,
  DEFAULT_RUNTIME_ROOT,
  OUTBOX_DIRECTORY_NAME,
  assertSubjectToken,
} from './contracts.mjs';

function normalizeDate(value = new Date()) {
  return value instanceof Date ? value : new Date(value);
}

function formatDayPartition(value = new Date()) {
  return normalizeDate(value).toISOString().slice(0, 10);
}

export function resolveRuntimeRoot(runtimeRoot = DEFAULT_RUNTIME_ROOT) {
  return path.resolve(runtimeRoot);
}

export function resolveOutboxDirectory({ runtimeRoot = DEFAULT_RUNTIME_ROOT, host, agentId }) {
  return path.join(
    resolveRuntimeRoot(runtimeRoot),
    OUTBOX_DIRECTORY_NAME,
    assertSubjectToken('host', host),
    assertSubjectToken('agentId', agentId),
  );
}

export function resolveOutboxFilePath({ runtimeRoot = DEFAULT_RUNTIME_ROOT, host, agentId, timestamp = new Date() }) {
  return path.join(
    resolveOutboxDirectory({ runtimeRoot, host, agentId }),
    `${formatDayPartition(timestamp)}.ndjson`,
  );
}

async function statOrNull(targetPath) {
  try {
    return await fs.stat(targetPath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function getDirectoryBytes(directory) {
  const stats = await statOrNull(directory);
  if (!stats) {
    return 0;
  }

  if (!stats.isDirectory()) {
    return stats.size;
  }

  let total = 0;
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    total += await getDirectoryBytes(path.join(directory, entry.name));
  }
  return total;
}

async function readLines(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return content
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0);
}

export async function listOutboxFiles({ runtimeRoot = DEFAULT_RUNTIME_ROOT, host, agentId }) {
  const directory = resolveOutboxDirectory({ runtimeRoot, host, agentId });
  const stats = await statOrNull(directory);
  if (!stats?.isDirectory()) {
    return [];
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ndjson'))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

export async function getOutboxBacklog({ runtimeRoot = DEFAULT_RUNTIME_ROOT, host, agentId }) {
  const files = await listOutboxFiles({ runtimeRoot, host, agentId });
  let events = 0;
  for (const filePath of files) {
    events += (await readLines(filePath)).length;
  }

  return {
    files: files.length,
    events,
    bytes: await getDirectoryBytes(resolveOutboxDirectory({ runtimeRoot, host, agentId })),
  };
}

export async function readBufferedEvents({ runtimeRoot = DEFAULT_RUNTIME_ROOT, host, agentId }) {
  const files = await listOutboxFiles({ runtimeRoot, host, agentId });
  const buffered = [];

  for (const filePath of files) {
    for (const line of await readLines(filePath)) {
      buffered.push(JSON.parse(line));
    }
  }

  return buffered;
}

export async function appendBufferedEvent({
  runtimeRoot = DEFAULT_RUNTIME_ROOT,
  host,
  agentId,
  event,
  maxBytes = DEFAULT_OUTBOX_MAX_BYTES,
  timestamp = new Date(),
}) {
  const filePath = resolveOutboxFilePath({ runtimeRoot, host, agentId, timestamp });
  const directory = path.dirname(filePath);
  const line = `${JSON.stringify(event)}\n`;
  const encodedBytes = Buffer.byteLength(line);
  const currentBytes = await getDirectoryBytes(resolveOutboxDirectory({ runtimeRoot, host, agentId }));

  if (currentBytes + encodedBytes > maxBytes) {
    throw new CoordinationUnavailableError('Local coordination outbox cap exceeded', {
      code: 'coordination_outbox_full',
      details: {
        currentBytes,
        encodedBytes,
        maxBytes,
      },
    });
  }

  await fs.mkdir(directory, { recursive: true });
  await fs.appendFile(filePath, line, 'utf8');

  return {
    filePath,
    bytes: currentBytes + encodedBytes,
  };
}

export async function flushLocalOutbox({
  runtimeRoot = DEFAULT_RUNTIME_ROOT,
  host,
  agentId,
  publishEvent,
}) {
  if (typeof publishEvent !== 'function') {
    throw new TypeError('flushLocalOutbox requires a publishEvent function');
  }

  const files = await listOutboxFiles({ runtimeRoot, host, agentId });
  let flushed = 0;
  let blocked = false;

  for (const filePath of files) {
    const lines = await readLines(filePath);
    const remaining = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const parsed = JSON.parse(line);

      try {
        await publishEvent(parsed);
        flushed += 1;
      } catch (error) {
        blocked = true;
        remaining.push(line, ...lines.slice(index + 1));
        break;
      }
    }

    if (remaining.length === 0) {
      await fs.rm(filePath, { force: true });
    } else {
      await fs.writeFile(filePath, `${remaining.join('\n')}\n`, 'utf8');
      break;
    }
  }

  const backlog = await getOutboxBacklog({ runtimeRoot, host, agentId });
  return {
    flushed,
    blocked,
    ...backlog,
  };
}
