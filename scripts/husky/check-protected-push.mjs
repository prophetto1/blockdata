import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parsePrePushLines, ZERO_OID } from './changed-files.mjs';

export function evaluateProtectedPush(stdinText) {
  const violations = [];

  for (const line of parsePrePushLines(stdinText)) {
    if (line.remoteRef === 'refs/heads/master') {
      violations.push({
        line,
        reason: `pushes to ${line.remoteRef} are blocked`,
      });
      continue;
    }

    if (line.localSha === ZERO_OID) {
      violations.push({
        line,
        reason: `remote delete operations are blocked for ${line.remoteRef}`,
      });
    }
  }

  return { violations };
}

function main(stdinText) {
  const result = evaluateProtectedPush(stdinText);
  for (const violation of result.violations) {
    console.error(violation.reason);
  }
  return result.violations.length > 0 ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let stdinText = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    stdinText += chunk;
  });
  process.stdin.on('end', () => {
    process.exitCode = main(stdinText);
  });
}
