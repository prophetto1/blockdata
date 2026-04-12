import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { getChangedFilesForPushLines, getStagedFiles, parsePrePushLines } from './changed-files.mjs';
import { selectHookGroups } from './hook-groups.mjs';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function readPrePushStdin() {
  return fs.readFileSync(0, 'utf8');
}

function getChangedPathsForStage(stage, stdinText = '') {
  if (stage === 'pre-commit') {
    return getStagedFiles();
  }

  if (stage === 'pre-push') {
    const pushLines = parsePrePushLines(stdinText);
    return getChangedFilesForPushLines(pushLines);
  }

  return [];
}

function runCommands(commands, { stdinText = '' } = {}) {
  for (const command of commands) {
    const result = spawnSync(command, {
      cwd: repoRoot,
      env: process.env,
      shell: true,
      input: stdinText,
      stdio: ['pipe', 'inherit', 'inherit'],
    });

    if (result.status !== 0) {
      return result.status ?? 1;
    }
  }

  return 0;
}

function main(argv) {
  const stage = argv[2];
  if (!stage) {
    console.error('Expected a hook stage argument');
    return 1;
  }

  const stdinText = stage === 'pre-push' ? readPrePushStdin() : '';
  const changedPaths = getChangedPathsForStage(stage, stdinText);
  const selectedGroups = selectHookGroups({ stage, changedPaths });
  if (selectedGroups.length === 0) {
    console.log(`[husky] ${stage}: no hook groups matched`);
    return 0;
  }

  console.log(`[husky] ${stage}: ${selectedGroups.map((group) => group.id).join(', ')}`);
  for (const group of selectedGroups) {
    const exitCode = runCommands(group.commands, { stdinText });
    if (exitCode !== 0) {
      return exitCode;
    }
  }

  return 0;
}

process.exitCode = main(process.argv);
