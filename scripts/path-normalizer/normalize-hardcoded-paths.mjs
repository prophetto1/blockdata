import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SKIP_DIRS = new Set([
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

const DEFAULT_TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.env',
  '.html',
  '.ini',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mdx',
  '.mjs',
  '.ps1',
  '.py',
  '.scss',
  '.sh',
  '.sql',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

const DEFAULT_IGNORED_BASENAMES = new Set([
  'desktop.ini',
]);

const ABSOLUTE_WINDOWS_PATH_PATTERN = /(?<![A-Za-z0-9_])([A-Za-z]:(?:\\+|\/)[^\s"'`<>,;\r\n]+)/g;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSlashes(value) {
  return value.replace(/\\+/g, '/').replace(/\/+/g, '/');
}

function normalizeAbsoluteRoot(rootPath) {
  const resolved = path.resolve(rootPath);
  return normalizeSlashes(resolved).replace(/\/+$/, '');
}

function canonicalizeRelativePath(candidate) {
  const normalized = normalizeSlashes(candidate)
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  return normalized || '.';
}

function buildRootMappings({ repoRoot, aliasRoots = [], rootMaps = [] }) {
  const mappings = [
    { from: normalizeAbsoluteRoot(repoRoot), to: '.' },
    ...aliasRoots.map((rootPath) => ({ from: normalizeAbsoluteRoot(rootPath), to: '.' })),
    ...rootMaps.map((mapping) => ({
      from: normalizeAbsoluteRoot(mapping.from),
      to: canonicalizeRelativePath(mapping.to),
    })),
  ];

  const unique = new Map();
  for (const mapping of mappings) {
    const key = `${mapping.from}=>${mapping.to}`;
    if (!unique.has(key)) {
      unique.set(key, mapping);
    }
  }

  return [...unique.values()].sort(
    (left, right) => right.from.length - left.from.length || left.from.localeCompare(right.from),
  );
}

function getRepoEntries(repoRoot) {
  const entries = fs.readdirSync(repoRoot, { withFileTypes: true });
  return entries
    .map((entry) => entry.name)
    .filter((name) => name !== '.git')
    .sort((left, right) => right.length - left.length || left.localeCompare(right));
}

function buildRelativeRepoPattern(repoEntries) {
  const escapedEntries = [...repoEntries].map(escapeRegex);
  if (escapedEntries.length === 0) {
    return null;
  }

  return new RegExp(
    `(?<![A-Za-z0-9_./-])((?:\\.(?:\\\\+|/))?(?:${escapedEntries.join('|')})(?:(?:\\\\+|/)[^\\s"'\\\`<>,;\\r\\n]+)+)`,
    'g',
  );
}

function createLineStarts(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\n') {
      starts.push(index + 1);
    }
  }
  return starts;
}

function locateIndex(lineStarts, index) {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const start = lineStarts[middle];
    const next = middle + 1 < lineStarts.length ? lineStarts[middle + 1] : Number.POSITIVE_INFINITY;

    if (index < start) {
      high = middle - 1;
    } else if (index >= next) {
      low = middle + 1;
    } else {
      return {
        line: middle + 1,
        column: index - start + 1,
      };
    }
  }

  return {
    line: lineStarts.length,
    column: 1,
  };
}

function isOverlap(start, end, occupiedRanges) {
  return occupiedRanges.some((range) => start < range.end && end > range.start);
}

function classifyAbsolutePathToken(token, rootMappings) {
  const normalizedToken = normalizeSlashes(token);

  for (const mapping of rootMappings) {
    if (normalizedToken === mapping.from || normalizedToken.startsWith(`${mapping.from}/`)) {
      const suffix = normalizedToken.slice(mapping.from.length).replace(/^\/+/, '');
      const relativePath = mapping.to === '.'
        ? canonicalizeRelativePath(suffix)
        : canonicalizeRelativePath(`${mapping.to}/${suffix}`);
      return {
        kind: 'repo-absolute',
        replacement: relativePath,
      };
    }
  }

  return {
    kind: 'external-absolute',
    replacement: null,
  };
}

function classifyRelativePathToken(token, repoEntries) {
  const normalizedToken = canonicalizeRelativePath(token);
  if (normalizedToken.startsWith('../') || normalizedToken === '..') {
    return null;
  }

  const [firstSegment] = normalizedToken.split('/');
  if (!repoEntries.has(firstSegment)) {
    return null;
  }

  if (normalizedToken === token) {
    return null;
  }

  return {
    kind: 'repo-relative',
    replacement: normalizedToken,
  };
}

function collectMatches(text, pattern, classifyToken, occupiedRanges, lineStarts) {
  const matches = [];
  pattern.lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const token = match[1] ?? match[0];
    const start = match.index + match[0].indexOf(token);
    const end = start + token.length;

    if (isOverlap(start, end, occupiedRanges)) {
      continue;
    }

    const details = classifyToken(token);
    if (!details) {
      continue;
    }

    const location = locateIndex(lineStarts, start);
    matches.push({
      start,
      end,
      original: token,
      ...details,
      ...location,
    });
    occupiedRanges.push({ start, end });
  }

  return matches;
}

export function rewriteHardcodedPathsInText(
  text,
  {
    repoRoot = process.cwd(),
    aliasRoots = [],
    rootMaps = [],
    repoEntries = getRepoEntries(path.resolve(repoRoot)),
  } = {},
) {
  const rootMappings = buildRootMappings({ repoRoot, aliasRoots, rootMaps });
  const repoEntrySet = new Set(repoEntries);
  const relativePattern = buildRelativeRepoPattern(repoEntrySet);
  const lineStarts = createLineStarts(text);
  const occupiedRanges = [];

  const matches = collectMatches(
    text,
    ABSOLUTE_WINDOWS_PATH_PATTERN,
    (token) => classifyAbsolutePathToken(token, rootMappings),
    occupiedRanges,
    lineStarts,
  );

  if (relativePattern) {
    matches.push(
      ...collectMatches(
        text,
        relativePattern,
        (token) => classifyRelativePathToken(token, repoEntrySet),
        occupiedRanges,
        lineStarts,
      ),
    );
  }

  matches.sort((left, right) => left.start - right.start);

  let cursor = 0;
  let rewritten = '';
  for (const match of matches) {
    rewritten += text.slice(cursor, match.start);
    rewritten += match.replacement ?? match.original;
    cursor = match.end;
  }
  rewritten += text.slice(cursor);

  return {
    text: rewritten,
    matches,
  };
}

function isTextFile(filePath) {
  return DEFAULT_TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function collectTargetFiles(rootDir, targets = []) {
  const resolvedTargets = targets.length === 0
    ? [rootDir]
    : targets.map((target) => path.resolve(rootDir, target));

  const files = [];
  const seen = new Set();

  function visit(currentPath) {
    if (seen.has(currentPath)) {
      return;
    }
    seen.add(currentPath);

    const stats = fs.statSync(currentPath);
    if (stats.isDirectory()) {
      for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
        if (entry.isDirectory() && DEFAULT_SKIP_DIRS.has(entry.name)) {
          continue;
        }
        visit(path.join(currentPath, entry.name));
      }
      return;
    }

    if (
      stats.isFile()
      && isTextFile(currentPath)
      && !DEFAULT_IGNORED_BASENAMES.has(path.basename(currentPath).toLowerCase())
    ) {
      files.push(currentPath);
    }
  }

  for (const target of resolvedTargets) {
    if (!fs.existsSync(target)) {
      throw new Error(`Target does not exist: ${target}`);
    }
    visit(target);
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function countCorrectPathsInText(text, repoEntries) {
  const repoEntrySet = new Set(repoEntries);
  const relativePattern = buildRelativeRepoPattern(repoEntrySet);
  if (!relativePattern) {
    return 0;
  }

  let count = 0;
  relativePattern.lastIndex = 0;
  for (const match of text.matchAll(relativePattern)) {
    const token = match[1] ?? match[0];
    const normalized = canonicalizeRelativePath(token);
    if (normalized !== token) {
      continue;
    }
    if (normalized.startsWith('../') || normalized === '..') {
      continue;
    }
    const [firstSegment] = normalized.split('/');
    if (!repoEntrySet.has(firstSegment)) {
      continue;
    }
    count += 1;
  }

  return count;
}

function groupIssuesByFile(issues) {
  const groups = new Map();
  for (const issue of issues) {
    if (!groups.has(issue.file)) {
      groups.set(issue.file, []);
    }
    groups.get(issue.file).push(issue);
  }
  return [...groups.entries()].map(([file, fileIssues]) => ({
    file,
    issues: fileIssues.sort((left, right) => left.line - right.line || left.column - right.column),
  }));
}

const ISSUE_BUCKETS = [
  {
    key: 'auto-fix',
    heading: 'Auto-Fix Candidates',
    meaning: 'Safe repo-relative normalization is available.',
    nextStep: 'Run with `--write` after review.',
    description: 'These findings already have a concrete rewrite and are the lowest-risk cleanup items.',
  },
  {
    key: 'repo-alias',
    heading: 'Mounted Repo or Separate Fork Paths',
    meaning: 'Looks like a mounted share or separate fork, not this repo root.',
    nextStep: 'Leave unresolved unless you intentionally provide an explicit mapping.',
    description: 'These paths may point at another machine or fork. The script must not auto-collapse them into this repo without an explicit mapping.',
  },
  {
    key: 'machine-local',
    heading: 'Machine-Local Paths',
    meaning: 'User-profile or tool-state path that will vary by machine.',
    nextStep: 'Parameterize it, rewrite it as documentation, or intentionally leave it as machine-specific.',
    description: 'These usually point into `C:\\Users\\...`, `AppData`, or AI/tool state directories and are not portable across machines.',
  },
  {
    key: 'external-source',
    heading: 'External Source References',
    meaning: 'Source or provenance reference found in a comment or doc context.',
    nextStep: 'Keep it as provenance, or replace it with a portable note, URL, or repo-relative explanation.',
    description: 'These are usually explanatory references rather than runtime paths, so they are lower-risk but still non-portable.',
  },
  {
    key: 'manual-review',
    heading: 'Manual Review Needed',
    meaning: 'External path in executable or config-like context without a safe automatic rewrite.',
    nextStep: 'Review the surrounding line before changing it.',
    description: 'These findings may affect runtime or configuration behavior, so the report surfaces them separately instead of guessing.',
  },
];

const INVALIDATION_RULES = {
  REPO_RELATIVE: {
    id: 'PATH-REPO-RELATIVE',
    label: 'Repo-managed paths must be stored as repo-relative paths, not absolute machine paths.',
  },
  FORWARD_SLASHES: {
    id: 'PATH-FORWARD-SLASHES',
    label: 'Repo-relative paths must use normalized forward slashes.',
  },
  REPO_ALIAS: {
    id: 'PATH-REPO-ALIAS',
    label: 'Mounted shares or separate forks must not be rewritten into this repo unless an explicit mapping is intentionally provided.',
  },
  MACHINE_LOCAL: {
    id: 'PATH-MACHINE-LOCAL',
    label: 'User-profile and tool-state paths are machine-specific and not portable repo paths.',
  },
  PORTABLE_SOURCE_REF: {
    id: 'PATH-PORTABLE-SOURCE-REF',
    label: 'External source references in comments or docs should use portable references instead of machine paths.',
  },
  MANUAL_EXTERNAL: {
    id: 'PATH-EXTERNAL-REVIEW',
    label: 'External runtime or config paths require manual review before any rewrite.',
  },
};

function getIssueBucketDefinition(key) {
  return ISSUE_BUCKETS.find((bucket) => bucket.key === key) ?? ISSUE_BUCKETS.at(-1);
}

function classifyAuditIssue(issue) {
  const normalizedOriginal = normalizeSlashes(issue.original).toLowerCase();
  const lineText = (issue.lineText ?? '').trim();
  const fileExtension = path.extname(issue.file).toLowerCase();
  const isCommentLine = /^(#|\/\/|\/\*|\*|--|;)/.test(lineText);
  const isDocLikeFile = ['.md', '.mdx', '.txt'].includes(fileExtension);
  const isConfigLikeFile = ['.env', '.ini', '.json', '.toml', '.yaml', '.yml'].includes(fileExtension);

  if (issue.replacement) {
    return getIssueBucketDefinition('auto-fix');
  }

  if (
    /^[a-z]:\/users\//i.test(normalizedOriginal)
    || normalizedOriginal.includes('/appdata/')
    || /\/\.(claude|codex|copilot|cursor|gemini|picoclaw)(\/|$)/i.test(normalizedOriginal)
  ) {
    return getIssueBucketDefinition('machine-local');
  }

  if (
    /^[a-z]:\//i.test(normalizedOriginal)
    && /\/(writing-system|blockdata-agchain)(\/|$)/i.test(normalizedOriginal)
  ) {
    return getIssueBucketDefinition('repo-alias');
  }

  if ((isCommentLine || isDocLikeFile) && /\b(source|derived from|copied from|ported from|origin)\b/i.test(lineText)) {
    return getIssueBucketDefinition('external-source');
  }

  if (isCommentLine || isDocLikeFile) {
    return getIssueBucketDefinition('external-source');
  }

  if (isConfigLikeFile) {
    return getIssueBucketDefinition('manual-review');
  }

  return getIssueBucketDefinition('manual-review');
}

function describeAuditIssue(issue) {
  const bucket = classifyAuditIssue(issue);

  if (issue.replacement) {
    if (issue.kind === 'repo-absolute') {
      return {
        bucket,
        issueType: 'Repo-Internal Absolute Path',
        rules: [INVALIDATION_RULES.REPO_RELATIVE],
        willChangeTo: issue.replacement,
      };
    }

    return {
      bucket,
      issueType: 'Repo Path Slash Normalization',
      rules: [INVALIDATION_RULES.FORWARD_SLASHES],
      willChangeTo: issue.replacement,
    };
  }

  if (bucket.key === 'repo-alias') {
    return {
      bucket,
      issueType: 'Mounted Repo or Separate Fork Path',
      rules: [INVALIDATION_RULES.REPO_ALIAS],
      willChangeTo: 'No automatic rewrite',
    };
  }

  if (bucket.key === 'machine-local') {
    return {
      bucket,
      issueType: 'Machine-Local User or Tool Path',
      rules: [INVALIDATION_RULES.MACHINE_LOCAL],
      willChangeTo: 'No automatic rewrite',
    };
  }

  if (bucket.key === 'external-source') {
    return {
      bucket,
      issueType: 'External Source or Provenance Reference',
      rules: [INVALIDATION_RULES.PORTABLE_SOURCE_REF],
      willChangeTo: 'No automatic rewrite',
    };
  }

  return {
    bucket,
    issueType: 'External Runtime or Config Path',
    rules: [INVALIDATION_RULES.MANUAL_EXTERNAL],
    willChangeTo: 'No automatic rewrite',
  };
}

function formatDisplayedChange(issue) {
  const described = describeAuditIssue(issue);
  if (described.willChangeTo === '.') {
    return '<repo-root>';
  }
  if (described.willChangeTo === 'No automatic rewrite') {
    return 'No automatic rewrite';
  }
  return described.willChangeTo.replace(/^\./, '<repo-root>');
}

function formatIssueLine(issue) {
  const location = `Line ${issue.line}, column ${issue.column}`;
  const before = issue.original;
  const after = formatDisplayedChange(issue);
  return `- ${location}: \`${before}\` -> \`${after}\``;
}

export function renderHardcodedPathAuditMarkdown(report) {
  const lines = [
    '# Hardcoded Path Audit',
    '',
    `Repo root: \`${report.repoRoot.replace(/\\/g, '/')}\``,
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| Total paths found | ${report.totalPathCount} |`,
    `| Correct | ${report.correctPathCount} |`,
    `| Incorrect | ${report.issueCount} |`,
    `| Scanned files | ${report.scannedFileCount} |`,
    `| Fixable | ${report.fixableMatchCount} |`,
    `| Unresolved | ${report.unresolvedMatchCount} |`,
    `| Changed files | ${report.changedFileCount} |`,
  ];

  if (report.aliasRoots.length > 0) {
    lines.push('', '## Alias Roots', '');
    for (const rootPath of report.aliasRoots) {
      lines.push(`- \`${rootPath}\``);
    }
  }

  if (report.rootMaps.length > 0) {
    lines.push('', '## Root Maps', '');
    for (const mapping of report.rootMaps) {
      lines.push(`- \`${mapping.from}\` -> \`${mapping.to}\``);
    }
  }

  lines.push('', '## Incorrect Paths', '');
  if (report.issues.length === 0) {
    lines.push('(none)');
  } else {
    for (const group of groupIssuesByFile(report.issues)) {
      lines.push(`### \`${group.file}\``, '');
      for (const issue of group.issues) {
        lines.push(formatIssueLine(issue));
      }
      lines.push('');
    }

    if (lines.at(-1) === '') {
      lines.pop();
    }
  }

  return `${lines.join('\n')}\n`;
}

function writeAuditReportFile({ repoRoot, reportPath, report }) {
  const resolvedReportPath = path.resolve(repoRoot, reportPath);
  fs.mkdirSync(path.dirname(resolvedReportPath), { recursive: true });
  fs.writeFileSync(resolvedReportPath, renderHardcodedPathAuditMarkdown(report), 'utf8');
  return resolvedReportPath;
}

export function auditHardcodedPaths({
  cwd = process.cwd(),
  targets = [],
  aliasRoots = [],
  rootMaps = [],
  reportPath = null,
  write = false,
} = {}) {
  const repoRoot = path.resolve(cwd);
  const repoEntries = getRepoEntries(repoRoot);
  const resolvedReportPath = reportPath ? path.resolve(repoRoot, reportPath) : null;
  const files = collectTargetFiles(repoRoot, targets).filter((filePath) => {
    if (!resolvedReportPath) {
      return true;
    }
    return path.resolve(filePath) !== resolvedReportPath;
  });
  const issues = [];
  let correctPathCount = 0;
  let changedFileCount = 0;
  let fixableMatchCount = 0;
  let unresolvedMatchCount = 0;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const contentLines = content.split(/\r?\n/);
    const relativeFilePath = path.relative(repoRoot, filePath).replace(/\\/g, '/');
    correctPathCount += countCorrectPathsInText(content, repoEntries);
    const result = rewriteHardcodedPathsInText(content, {
      repoRoot,
      aliasRoots,
      rootMaps,
      repoEntries,
    });

    if (result.matches.length === 0) {
      continue;
    }

    let fileHasFix = false;
    for (const match of result.matches) {
      const issue = {
        file: relativeFilePath,
        line: match.line,
        column: match.column,
        lineText: contentLines[match.line - 1] ?? '',
        kind: match.kind,
        original: match.original,
        replacement: match.replacement,
      };
      issues.push(issue);

      if (match.replacement) {
        fixableMatchCount += 1;
        fileHasFix = true;
      } else {
        unresolvedMatchCount += 1;
      }
    }

    if (write && fileHasFix && result.text !== content) {
      fs.writeFileSync(filePath, result.text, 'utf8');
      changedFileCount += 1;
    }
  }

  const report = {
    repoRoot,
    aliasRoots: aliasRoots.map((rootPath) => normalizeAbsoluteRoot(rootPath)),
    rootMaps: buildRootMappings({ repoRoot, aliasRoots, rootMaps }).filter((mapping) => mapping.to !== '.'),
    scannedFileCount: files.length,
    totalPathCount: correctPathCount + issues.length,
    correctPathCount,
    issueCount: issues.length,
    fixableMatchCount,
    unresolvedMatchCount,
    changedFileCount,
    issues,
  };

  if (reportPath) {
    const writtenReportPath = writeAuditReportFile({
      repoRoot,
      reportPath: resolvedReportPath,
      report,
    });
    report.reportPath = writtenReportPath;
    report.relativeReportPath = path.relative(repoRoot, writtenReportPath).replace(/\\/g, '/');
  } else {
    report.reportPath = null;
    report.relativeReportPath = null;
  }

  return report;
}

function parseArgs(argv) {
  const options = {
    targets: [],
    aliasRoots: [],
    rootMaps: [],
    reportPath: null,
    write: false,
    allowRepoWideWrite: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--target') {
      options.targets.push(argv[++index]);
    } else if (arg === '--alias-root') {
      options.aliasRoots.push(argv[++index]);
    } else if (arg === '--report') {
      options.reportPath = argv[++index];
    } else if (arg === '--map-root') {
      const value = argv[++index];
      const separatorIndex = value.indexOf('=');
      if (separatorIndex === -1) {
        throw new Error(`Invalid --map-root value "${value}". Use <absolute-prefix>=<repo-relative-prefix>.`);
      }
      options.rootMaps.push({
        from: value.slice(0, separatorIndex),
        to: value.slice(separatorIndex + 1),
      });
    } else if (arg === '--write') {
      options.write = true;
    } else if (arg === '--all') {
      options.allowRepoWideWrite = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.write && options.targets.length === 0 && !options.allowRepoWideWrite) {
    throw new Error('Repo-wide write mode is blocked by default. Pass --target <path> or add --all.');
  }

  return options;
}

function printHelp() {
  console.log(`Audit repo files for hardcoded repo paths and rewrite them to canonical repo-relative form.

Usage:
  node scripts/normalize-hardcoded-paths.mjs [options]

Options:
  --target <path>       Scan only this file or directory. Can be repeated.
  --alias-root <path>   Additional absolute repo root alias to rewrite. Can be repeated.
  --report <path>       Write the audit results to a Markdown document.
  --map-root <a=b>      Map an alternate absolute prefix into a repo-relative prefix.
  --write               Apply fixable rewrites in place.
  --all                 Allow repo-wide writes when --write is set without --target.
  --json                Print the full report as JSON.
  --help                Show this help message
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
    aliasRoots: report.aliasRoots,
    rootMaps: report.rootMaps,
  }, null, 2));

  const fixable = report.issues.filter((issue) => issue.replacement);
  const unresolved = report.issues.filter((issue) => !issue.replacement);

  console.log('\nFixable:');
  if (fixable.length === 0) {
    console.log('(none)');
  } else {
    for (const issue of fixable) {
      console.log(`${issue.file}:${issue.line}:${issue.column}`);
      console.log(`  ${issue.original}`);
      console.log(`  -> ${issue.replacement}`);
    }
  }

  console.log('\nUnresolved:');
  if (unresolved.length === 0) {
    console.log('(none)');
  } else {
    for (const issue of unresolved) {
      console.log(`${issue.file}:${issue.line}:${issue.column}`);
      console.log(`  ${issue.original}`);
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

    const report = auditHardcodedPaths({
      cwd: process.cwd(),
      targets: options.targets,
      aliasRoots: options.aliasRoots,
      rootMaps: options.rootMaps,
      reportPath: options.reportPath,
      write: options.write,
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
