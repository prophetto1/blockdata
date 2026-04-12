import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP_WORKTREE_DIRS = new Set([
  '.git',
  '.next',
  '.pytest_cache',
  '.turbo',
  '.venv',
  '.vercel',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'output',
  'venv',
]);

function isDesktopIni(name) {
  return name.toLowerCase() === 'desktop.ini';
}

function normalizeOutput(value) {
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  return String(value ?? '');
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function normalizeRelativePath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\/+/, '');
}

export function resolveGitMetadataDirectory(repoRoot) {
  const gitEntryPath = path.join(repoRoot, '.git');
  if (!fs.existsSync(gitEntryPath)) {
    return null;
  }

  const stats = fs.statSync(gitEntryPath);
  if (stats.isDirectory()) {
    return gitEntryPath;
  }

  const raw = fs.readFileSync(gitEntryPath, 'utf8');
  const match = raw.match(/^gitdir:\s*(.+)\s*$/m);
  if (!match) {
    throw new Error(`Unable to resolve git metadata directory from ${gitEntryPath}`);
  }

  return path.resolve(repoRoot, match[1].trim());
}

function collectDesktopIniPaths(rootDir, { skipDirs = new Set(), recursive = true } = {}) {
  if (!rootDir || !fs.existsSync(rootDir)) {
    return [];
  }

  const foundPaths = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const currentDir = queue.pop();
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (recursive && !skipDirs.has(entry.name)) {
          queue.push(fullPath);
        }
        continue;
      }

      if (entry.isFile() && isDesktopIni(entry.name)) {
        foundPaths.push(fullPath);
      }
    }
  }

  return foundPaths.sort();
}

function readGitPathList(repoRoot, args, { execFileSyncImpl = execFileSync } = {}) {
  const output = normalizeOutput(execFileSyncImpl('git', args, {
    cwd: repoRoot,
  }));
  return uniqueSorted(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

function getStagedFiles(repoRoot, options = {}) {
  return readGitPathList(repoRoot, ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], options);
}

function isPathInside(parentPath, candidatePath) {
  const relativePath = path.relative(parentPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function getAncestorDirectories(repoRoot, filePath) {
  const ancestors = [];
  let currentDir = path.dirname(filePath);

  while (isPathInside(repoRoot, currentDir)) {
    ancestors.push(currentDir);
    if (currentDir === repoRoot) {
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  return ancestors;
}

function collectStagedDesktopIniPaths(repoRoot, stagedFiles) {
  const candidateDirs = new Set();
  const candidateFiles = new Set();

  for (const stagedFile of stagedFiles) {
    const absolutePath = path.resolve(repoRoot, stagedFile);
    if (!isPathInside(repoRoot, absolutePath)) {
      continue;
    }

    if (isDesktopIni(path.basename(absolutePath))) {
      candidateFiles.add(absolutePath);
    }

    for (const ancestorDir of getAncestorDirectories(repoRoot, absolutePath)) {
      candidateDirs.add(ancestorDir);
    }
  }

  const foundPaths = [
    ...candidateFiles,
    ...[...candidateDirs].flatMap((directoryPath) => (
      collectDesktopIniPaths(directoryPath, { recursive: false })
    )),
  ];

  return {
    foundPaths: uniqueSorted(foundPaths),
    scannedRoots: uniqueSorted([...candidateDirs]),
  };
}

function toRepoRelativeWorktreePath(repoRoot, metadataDir, filePath) {
  if (!isPathInside(repoRoot, filePath)) {
    return null;
  }

  if (metadataDir && isPathInside(metadataDir, filePath)) {
    return null;
  }

  const relativePath = normalizeRelativePath(path.relative(repoRoot, filePath));
  if (!relativePath || relativePath.startsWith('.git/')) {
    return null;
  }

  return relativePath;
}

function dropDeletedPathsFromIndex(repoRoot, deletedPaths, metadataDir, { execFileSyncImpl = execFileSync } = {}) {
  const relativePaths = uniqueSorted(
    deletedPaths
      .map((filePath) => toRepoRelativeWorktreePath(repoRoot, metadataDir, filePath))
      .filter(Boolean),
  );

  if (relativePaths.length === 0) {
    return [];
  }

  execFileSyncImpl('git', ['rm', '--cached', '--ignore-unmatch', '--force', '--', ...relativePaths], {
    cwd: repoRoot,
    stdio: 'ignore',
  });

  return relativePaths;
}

export function cleanupDesktopIni({
  repoRoot = process.cwd(),
  write = false,
  scope = 'full',
  stagedFiles = null,
  execFileSyncImpl = execFileSync,
} = {}) {
  const startTime = Date.now();
  const metadataDir = resolveGitMetadataDirectory(repoRoot);
  const scanMode = scope === 'staged' ? 'staged' : 'full';
  const staged = scanMode === 'staged'
    ? uniqueSorted(stagedFiles ?? getStagedFiles(repoRoot, { execFileSyncImpl }))
    : [];

  const worktreeResult = scanMode === 'staged'
    ? collectStagedDesktopIniPaths(repoRoot, staged)
    : {
        foundPaths: collectDesktopIniPaths(repoRoot, { skipDirs: SKIP_WORKTREE_DIRS }),
        scannedRoots: [repoRoot],
      };

  const metadataPaths = collectDesktopIniPaths(metadataDir);
  const foundPaths = uniqueSorted([
    ...worktreeResult.foundPaths,
    ...metadataPaths,
  ]);

  const deletedPaths = [];
  if (write) {
    for (const filePath of foundPaths) {
      fs.unlinkSync(filePath);
      deletedPaths.push(filePath);
    }

    dropDeletedPathsFromIndex(repoRoot, deletedPaths, metadataDir, { execFileSyncImpl });
  }

  return {
    foundPaths,
    deletedPaths,
    metadataDir,
    repoRoot,
    scanMode,
    scannedRoots: uniqueSorted([
      ...worktreeResult.scannedRoots,
      ...(metadataDir ? [metadataDir] : []),
    ]),
    stagedFiles: staged,
    durationMs: Date.now() - startTime,
  };
}

function parseArgs(argv) {
  const options = {
    write: false,
    check: false,
    scope: 'full',
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--write') {
      options.write = true;
    } else if (arg === '--check') {
      options.check = true;
    } else if (arg === '--staged') {
      options.scope = 'staged';
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.write && options.check) {
    throw new Error('Choose either --write or --check, not both.');
  }

  return options;
}

function printHelp() {
  console.log(`Remove or report desktop.ini pollution from the work tree and Git metadata.

Usage:
  node _collaborate/scripts/repo-hygiene/remove-desktop-ini.mjs [options]

Options:
  --write    Delete discovered desktop.ini files.
  --check    Report discovered desktop.ini files and exit nonzero when any are found.
  --staged   Limit worktree scanning to staged-path ancestor roots while still sweeping Git metadata.
  --help     Show this help message.
`);
}

function main(argv) {
  const options = parseArgs(argv);

  if (options.help) {
    printHelp();
    return 0;
  }

  const result = cleanupDesktopIni({ write: options.write, scope: options.scope });

  if (options.write) {
    if (result.deletedPaths.length > 0) {
      console.log(`removed ${result.deletedPaths.length} desktop.ini file(s)`);
    }
    return 0;
  }

  for (const foundPath of result.foundPaths) {
    console.log(foundPath);
  }

  if (options.check && result.foundPaths.length > 0) {
    return 1;
  }

  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
