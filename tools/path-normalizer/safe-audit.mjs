#!/usr/bin/env node

/**
 * Safe hardcoded path audit wrapper.
 *
 * Runs the existing normalizer in dry-run mode with known-bad file types
 * excluded. Outputs a clean before→after list for human review.
 *
 * Usage:
 *   node tools/path-normalizer/safe-audit.mjs
 *   node tools/path-normalizer/safe-audit.mjs --target web/dev-server
 *   node tools/path-normalizer/safe-audit.mjs --save report.md
 *
 * Never writes to source files. Audit only.
 */

import path from 'node:path';
import { auditHardcodedPaths } from './normalize-hardcoded-paths.mjs';

const SKIP_EXTENSIONS = new Set(['.json', '.ps1']);
const SKIP_PREFIXES = [
  'tools/path-normalizer/tests/',
  'tools/path-normalizer/reports/',
  'scripts/tests/hardcoded-path-audit.test.mjs',
  'scripts/tests/docs-perspective-audit.test.mjs',
  'scripts/tests/husky-hardcoded-paths.test.mjs',
  'web/public/vendor/',
  'web/.eslint-report',
  'web/.tmp-',
  'web/docs/component-inventory',
  'web/public/component-inventory',
];

function parseArgs(argv) {
  const options = { targets: [], savePath: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--target') options.targets.push(argv[++i]);
    else if (argv[i] === '--save') options.savePath = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Safe hardcoded path audit (dry-run only).

  --target <path>   Scan only this file or directory. Repeatable.
  --save <path>     Save the report to a file.
  --help            Show this help.
`);
      process.exit(0);
    }
  }
  return options;
}

function shouldSkip(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) return true;
  if (SKIP_PREFIXES.some((p) => filePath.startsWith(p))) return true;
  return false;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const report = auditHardcodedPaths({
    cwd: process.cwd(),
    targets: options.targets,
  });

  const kept = report.issues.filter((i) => !shouldSkip(i.file));
  const skipped = report.issues.filter((i) => shouldSkip(i.file));
  const fixable = kept.filter((i) => i.replacement);
  const unfixable = kept.filter((i) => !i.replacement);

  const lines = [];

  lines.push('# Safe Hardcoded Path Audit');
  lines.push('');
  lines.push(`Scanned: ${report.scannedFileCount} files`);
  lines.push(`Total issues found: ${report.issueCount}`);
  lines.push(`Skipped (json, ps1, test fixtures, vendor, generated): ${skipped.length}`);
  lines.push(`Remaining: ${kept.length} (${fixable.length} fixable, ${unfixable.length} external/manual)`);
  lines.push('');

  if (fixable.length > 0) {
    lines.push('## Fixable — what would change');
    lines.push('');
    lines.push('| # | File | Line | Before | After |');
    lines.push('|---|------|------|--------|-------|');
    fixable.forEach((issue, idx) => {
      lines.push(`| ${idx + 1} | ${issue.file} | ${issue.line} | \`${issue.original}\` | \`${issue.replacement}\` |`);
    });
    lines.push('');
  }

  if (unfixable.length > 0) {
    lines.push('## External / Manual — no auto-fix available');
    lines.push('');
    lines.push('| # | File | Line | Path | Kind |');
    lines.push('|---|------|------|------|------|');
    unfixable.forEach((issue, idx) => {
      lines.push(`| ${idx + 1} | ${issue.file} | ${issue.line} | \`${issue.original}\` | ${issue.kind} |`);
    });
    lines.push('');
  }

  if (skipped.length > 0) {
    lines.push('## Skipped — excluded by safety filter');
    lines.push('');
    const skippedByFile = {};
    for (const i of skipped) {
      skippedByFile[i.file] = (skippedByFile[i.file] || 0) + 1;
    }
    lines.push('| File | Count | Reason |');
    lines.push('|------|-------|--------|');
    for (const [file, count] of Object.entries(skippedByFile).sort((a, b) => b[1] - a[1])) {
      const ext = path.extname(file).toLowerCase();
      let reason = 'skip prefix';
      if (SKIP_EXTENSIONS.has(ext)) reason = `${ext} excluded`;
      lines.push(`| ${file} | ${count} | ${reason} |`);
    }
    lines.push('');
  }

  const output = lines.join('\n');
  console.log(output);

  if (options.savePath) {
    const { default: fs } = await import('node:fs');
    fs.writeFileSync(options.savePath, output, 'utf8');
    console.log(`\nSaved to ${options.savePath}`);
  }
}

main();
