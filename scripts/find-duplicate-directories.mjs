import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DEFAULT_SKIP_DIRS = new Set([
  '.git',
  '.next',
  '.vercel',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);

const DEFAULT_IGNORE_BASENAMES = new Set(['desktop.ini']);

function parseArgs(argv) {
  const options = {
    source: '__start-here/restore',
    recursiveSource: false,
    ignoreBasenames: new Set(DEFAULT_IGNORE_BASENAMES),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--source') {
      options.source = argv[++index];
    } else if (arg === '--recursive-source') {
      options.recursiveSource = true;
    } else if (arg === '--include-desktop-ini') {
      options.ignoreBasenames.delete('desktop.ini');
    } else if (arg === '--ignore-basename') {
      options.ignoreBasenames.add(argv[++index].toLowerCase());
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function isNestedPath(parentDir, childDir) {
  const relative = path.relative(parentDir, childDir);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function buildDirectoryIndex({
  repoRoot,
  ignoreBasenames,
  sourceRoot,
}) {
  const directories = [];

  function visit(currentDir) {
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return null;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));

    const signatureParts = [];
    const effectiveFiles = [];

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (DEFAULT_SKIP_DIRS.has(entry.name)) {
          continue;
        }

        const child = visit(absolutePath);
        if (!child) {
          continue;
        }

        signatureParts.push(`D:${entry.name}:${child.signature}`);
        effectiveFiles.push(...child.effectiveFiles.map((relativeFile) => path.join(entry.name, relativeFile)));
      } else if (entry.isFile()) {
        if (ignoreBasenames.has(entry.name.toLowerCase())) {
          continue;
        }

        const fileHash = sha256File(absolutePath);
        signatureParts.push(`F:${entry.name}:${fileHash}`);
        effectiveFiles.push(entry.name);
      }
    }

    const signature = crypto.createHash('sha256').update(signatureParts.join('\n')).digest('hex');
    const node = {
      absolutePath: currentDir,
      relativePath: path.relative(repoRoot, currentDir) || '.',
      signature,
      effectiveFileCount: effectiveFiles.length,
      isInsideSource: currentDir === sourceRoot || isNestedPath(sourceRoot, currentDir),
    };

    directories.push(node);

    return {
      signature,
      effectiveFiles,
    };
  }

  visit(repoRoot);
  return directories;
}

export function findDuplicateDirectories({
  cwd = process.cwd(),
  source = '__start-here/restore',
  recursiveSource = false,
  ignoreBasenames = ['desktop.ini'],
} = {}) {
  const repoRoot = path.resolve(cwd);
  const sourceRoot = path.resolve(repoRoot, source);
  const ignoreValues = Array.isArray(ignoreBasenames)
    ? ignoreBasenames
    : [...ignoreBasenames];
  const ignoreSet = new Set(ignoreValues.map((name) => name.toLowerCase()));

  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Source directory does not exist: ${sourceRoot}`);
  }

  if (!fs.statSync(sourceRoot).isDirectory()) {
    throw new Error(`Source path is not a directory: ${sourceRoot}`);
  }

  const directoryIndex = buildDirectoryIndex({
    repoRoot,
    ignoreBasenames: ignoreSet,
    sourceRoot,
  });

  const bySignature = new Map();
  for (const directory of directoryIndex) {
    if (!bySignature.has(directory.signature)) {
      bySignature.set(directory.signature, []);
    }
    bySignature.get(directory.signature).push(directory);
  }

  const sourceCandidates = directoryIndex.filter((directory) => {
    if (!directory.isInsideSource || directory.effectiveFileCount === 0) {
      return false;
    }

    if (!recursiveSource) {
      return path.dirname(directory.absolutePath) === sourceRoot;
    }

    return directory.absolutePath !== sourceRoot;
  }).sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const results = sourceCandidates.map((directory) => {
    const duplicates = (bySignature.get(directory.signature) || [])
      .filter((candidate) => !candidate.isInsideSource)
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
      .map((candidate) => ({
        relativePath: candidate.relativePath,
        effectiveFileCount: candidate.effectiveFileCount,
      }));

    return {
      sourceRelativePath: directory.relativePath,
      effectiveFileCount: directory.effectiveFileCount,
      duplicates,
    };
  });

  return {
    repoRoot,
    sourceRoot,
    sourceDirectoryCount: sourceCandidates.length,
    duplicateDirectoryCount: results.filter((row) => row.duplicates.length > 0).length,
    ignoredBasenames: [...ignoreSet].sort(),
    results,
  };
}

function printHelp() {
  console.log(`Find directories under a source tree whose full file structure already exists elsewhere in the repo.

Usage:
  node scripts/find-duplicate-directories.mjs [options]

Options:
  --source <dir>             Source tree to inspect. Default: __start-here/restore
  --recursive-source         Check nested source directories too, not just immediate child folders
  --include-desktop-ini      Count desktop.ini as a real file instead of ignoring it
  --ignore-basename <name>   Ignore additional basenames. Can be repeated.
  --help                     Show this help message
`);
}

function printReport(report) {
  const duplicated = report.results.filter((row) => row.duplicates.length > 0);
  const unique = report.results.filter((row) => row.duplicates.length === 0);

  console.log(JSON.stringify({
    sourceRoot: report.sourceRoot,
    sourceDirectoryCount: report.sourceDirectoryCount,
    duplicateDirectoryCount: report.duplicateDirectoryCount,
    ignoredBasenames: report.ignoredBasenames,
  }, null, 2));

  console.log('\nDuplicate directories:');
  if (duplicated.length === 0) {
    console.log('(none)');
  } else {
    for (const row of duplicated) {
      console.log(`${row.sourceRelativePath} (${row.effectiveFileCount} files)`);
      for (const duplicate of row.duplicates) {
        console.log(`  -> ${duplicate.relativePath}`);
      }
    }
  }

  console.log('\nNo duplicate found:');
  if (unique.length === 0) {
    console.log('(none)');
  } else {
    for (const row of unique) {
      console.log(`${row.sourceRelativePath} (${row.effectiveFileCount} files)`);
    }
  }
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  try {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const report = findDuplicateDirectories(options);
    printReport(report);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
