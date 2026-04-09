import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditHardcodedPaths } from './normalize-hardcoded-paths.mjs';

const DEFAULT_ROOT = 'scripts';
const DEFAULT_REPORT_PATH = 'scripts/path-normalizer/reports/scripts-hardcoded-path-audit.md';
const ALLOWED_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.py',
  '.ps1',
  '.psm1',
  '.sh',
  '.bash',
  '.bat',
  '.cmd',
]);
const EXCLUDED_PATH_PREFIXES = [
  'scripts/logs/',
  'scripts/path-normalizer/reports/',
];
const EXCLUDED_SEGMENTS = new Set(['tests', '__tests__', '__fixtures__', '__snapshots__']);
const EXCLUDED_BASENAMES = new Set(['desktop.ini']);

function toPosixPath(value) {
  return value.replace(/\\/g, '/');
}

function toAbsolutePath(cwd, targetPath) {
  return path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(cwd, targetPath);
}

function toRepoRelativePath(cwd, absolutePath) {
  return toPosixPath(path.relative(cwd, absolutePath));
}

function isWithinScripts(relativePath) {
  return relativePath === DEFAULT_ROOT || relativePath.startsWith(`${DEFAULT_ROOT}/`);
}

function shouldSkipFile(relativePath) {
  const basename = path.posix.basename(relativePath);
  const extension = path.posix.extname(relativePath).toLowerCase();

  if (EXCLUDED_BASENAMES.has(basename.toLowerCase())) {
    return true;
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return true;
  }

  if (/(\.test|\.spec)\.[^.]+$/i.test(basename)) {
    return true;
  }

  if (extension === '.jsonl') {
    return true;
  }

  if (EXCLUDED_PATH_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) {
    return true;
  }

  const segments = relativePath.split('/');
  return segments.some((segment) => EXCLUDED_SEGMENTS.has(segment));
}

function collectFiles({ cwd, absolutePath, files }) {
  const stats = fs.statSync(absolutePath);

  if (stats.isDirectory()) {
    const entries = fs.readdirSync(absolutePath, { withFileTypes: true });

    for (const entry of entries) {
      collectFiles({
        cwd,
        absolutePath: path.join(absolutePath, entry.name),
        files,
      });
    }

    return;
  }

  const relativePath = toRepoRelativePath(cwd, absolutePath);
  if (!isWithinScripts(relativePath) || shouldSkipFile(relativePath)) {
    return;
  }

  files.add(relativePath);
}

function normalizeRequestedTarget({ cwd, targetPath }) {
  const absolutePath = toAbsolutePath(cwd, targetPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Target does not exist: ${targetPath}`);
  }

  const relativePath = toRepoRelativePath(cwd, absolutePath);
  if (!isWithinScripts(relativePath)) {
    throw new Error(`Target must stay within ${DEFAULT_ROOT}/: ${targetPath}`);
  }

  return absolutePath;
}

export function listStrictScriptTargets({
  cwd = process.cwd(),
  targets = [],
} = {}) {
  const requestedTargets = targets.length > 0 ? targets : [DEFAULT_ROOT];
  const files = new Set();

  for (const targetPath of requestedTargets) {
    const absolutePath = normalizeRequestedTarget({ cwd, targetPath });
    collectFiles({ cwd, absolutePath, files });
  }

  return [...files].sort();
}

export function runStrictScriptsPathAudit({
  cwd = process.cwd(),
  targets = [],
  write = false,
  reportPath = DEFAULT_REPORT_PATH,
} = {}) {
  const strictTargets = listStrictScriptTargets({ cwd, targets });

  return auditHardcodedPaths({
    cwd,
    targets: strictTargets,
    reportPath,
    write,
  });
}

function parseArgs(argv) {
  const options = {
    targets: [],
    reportPath: DEFAULT_REPORT_PATH,
    write: false,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--target') {
      options.targets.push(argv[++index]);
    } else if (arg === '--report') {
      options.reportPath = argv[++index];
    } else if (arg === '--write') {
      options.write = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Audit hardcoded paths in runnable script sources only.

Usage:
  node scripts/path-normalizer/normalize-scripts-hardcoded-paths.mjs [options]

Options:
  --target <path>   Limit the scan to a file or directory under scripts/. Can be repeated.
  --report <path>   Write the audit results to a Markdown report.
  --write           Apply fixable rewrites in place for the curated script target set.
  --json            Print the full report as JSON.
  --help            Show this help message.

Default report:
  ${DEFAULT_REPORT_PATH}
`);
}

function printReport(report) {
  console.log(JSON.stringify({
    repoRoot: report.repoRoot,
    scannedFileCount: report.scannedFileCount,
    issueCount: report.issueCount,
    fixableMatchCount: report.fixableMatchCount,
    unresolvedMatchCount: report.unresolvedMatchCount,
    changedFileCount: report.changedFileCount,
    reportPath: report.relativeReportPath,
  }, null, 2));
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  try {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const report = runStrictScriptsPathAudit({
      cwd: process.cwd(),
      targets: options.targets,
      write: options.write,
      reportPath: options.reportPath,
    });

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
