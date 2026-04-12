import { execFileSync } from 'node:child_process';

import { auditHardcodedPaths } from '../../tools/path-normalizer/normalize-hardcoded-paths.mjs';
import { getStagedFiles } from './changed-files.mjs';
import { classifyPathPolicyScope, getPolicyTargets } from './path-policy.mjs';

function normalizeOutput(value) {
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  return String(value ?? '');
}

export function checkHardcodedPaths({
  cwd = process.cwd(),
  stagedFiles = null,
  auditImpl = auditHardcodedPaths,
} = {}) {
  const staged = stagedFiles ?? getStagedFiles();
  const targets = getPolicyTargets(staged);
  if (targets.length === 0) {
    return {
      exitCode: 0,
      blockingIssues: [],
      reviewIssues: [],
      ignoredIssues: [],
    };
  }

  const report = auditImpl({ cwd, targets });
  const blockingIssues = [];
  const reviewIssues = [];
  const ignoredIssues = [];

  for (const issue of report.issues ?? []) {
    const scope = classifyPathPolicyScope(issue.file);
    if (scope === 'block') {
      blockingIssues.push(issue);
    } else if (scope === 'review') {
      reviewIssues.push(issue);
    } else {
      ignoredIssues.push(issue);
    }
  }

  return {
    exitCode: blockingIssues.length > 0 ? 1 : 0,
    blockingIssues,
    reviewIssues,
    ignoredIssues,
  };
}

function printIssues(label, issues) {
  for (const issue of issues) {
    console.error(`${label}: ${issue.file}:${issue.line ?? 1}:${issue.column ?? 1} -> ${issue.original}`);
  }
}

function main(argv) {
  const stagedMode = argv.includes('--staged');
  if (!stagedMode) {
    console.error('Expected --staged');
    return 1;
  }

  const result = checkHardcodedPaths();
  printIssues('review', result.reviewIssues);
  printIssues('block', result.blockingIssues);
  return result.exitCode;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  process.exitCode = main(process.argv.slice(2));
}
