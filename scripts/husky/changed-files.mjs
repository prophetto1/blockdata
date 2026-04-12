import { execFileSync } from 'node:child_process';

export const ZERO_OID = '0000000000000000000000000000000000000000';

function normalizeOutput(value) {
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  return String(value ?? '');
}

function uniquePaths(paths) {
  return [...new Set(paths.filter(Boolean))].sort();
}

export function parsePrePushLines(stdinText) {
  return String(stdinText ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [localRef, localSha, remoteRef, remoteSha] = line.split(/\s+/);
      return {
        localRef,
        localSha,
        remoteRef,
        remoteSha,
      };
    });
}

function readGitPathList(args, { execFileSyncImpl = execFileSync } = {}) {
  const output = normalizeOutput(execFileSyncImpl('git', args));
  return uniquePaths(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

export function getStagedFiles(options = {}) {
  return readGitPathList(['diff', '--cached', '--name-only', '--diff-filter=ACMR'], options);
}

function rangeArgsForPushLine(line) {
  if (!line.localSha || line.localSha === ZERO_OID) {
    return null;
  }

  if (!line.remoteSha || line.remoteSha === ZERO_OID) {
    return ['diff-tree', '--no-commit-id', '--name-only', '-r', '--root', line.localSha];
  }

  return ['diff', '--name-only', `${line.remoteSha}..${line.localSha}`];
}

export function getChangedFilesForPushLines(lines, options = {}) {
  const changedPaths = [];
  for (const line of lines) {
    const args = rangeArgsForPushLine(line);
    if (!args) {
      continue;
    }
    changedPaths.push(...readGitPathList(args, options));
  }

  return uniquePaths(changedPaths);
}
