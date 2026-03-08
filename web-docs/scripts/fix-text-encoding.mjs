import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import fixUtf8 from 'fix-utf8';

const TEXT_EXTENSIONS = new Set([
  '.astro',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.mdx',
  '.mjs',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

const MAX_FIX_PASSES = 4;

export function fixMojibakeText(text) {
  let current = text;

  for (let index = 0; index < MAX_FIX_PASSES; index += 1) {
    const next = fixUtf8(current);
    if (next === current) break;
    current = next;
  }

  return current;
}

export function isDirectExecution(invokedPath, moduleUrl) {
  if (!invokedPath) return false;
  return pathToFileURL(invokedPath).href === moduleUrl;
}

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function getGitFiles(args) {
  const output = execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(isTextFile);
}

function getTargetFiles({ staged, explicitFiles }) {
  if (explicitFiles.length > 0) {
    return explicitFiles.filter(isTextFile);
  }

  if (staged) {
    return getGitFiles(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  }

  return getGitFiles(['ls-files']);
}

function fixFile(filePath, { write }) {
  const absolutePath = resolve(process.cwd(), filePath);
  const original = readFileSync(absolutePath, 'utf8');
  const fixed = fixMojibakeText(original);

  if (fixed === original) return null;

  if (write) {
    writeFileSync(absolutePath, fixed, 'utf8');
  }

  return { absolutePath, filePath };
}

function restageFiles(files) {
  if (files.length === 0) return;

  execFileSync('git', ['add', '--', ...files], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
}

function parseArgs(argv) {
  const options = {
    check: false,
    files: [],
    staged: false,
  };

  for (const arg of argv) {
    if (arg === '--check') {
      options.check = true;
      continue;
    }

    if (arg === '--staged') {
      options.staged = true;
      continue;
    }

    options.files.push(arg);
  }

  return options;
}

function main() {
  const { check, files, staged } = parseArgs(process.argv.slice(2));
  const targets = getTargetFiles({ staged, explicitFiles: files });
  const changed = [];

  for (const filePath of targets) {
    const result = fixFile(filePath, { write: !check });
    if (result) changed.push(result);
  }

  if (!check && staged) {
    restageFiles(changed.map((entry) => entry.filePath));
  }

  if (changed.length === 0) {
    console.log('No mojibake fixes needed.');
    return;
  }

  const paths = changed.map((entry) => relative(process.cwd(), entry.absolutePath));

  if (check) {
    console.error('Mojibake detected in:');
    for (const filePath of paths) {
      console.error(`- ${filePath}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Fixed text encoding in ${changed.length} file(s):`);
  for (const filePath of paths) {
    console.log(`- ${filePath}`);
  }
}

if (isDirectExecution(process.argv[1], import.meta.url)) {
  main();
}
