#!/usr/bin/env node

import path from 'node:path';

import { importCaseLawCorpus, parseReporterSlugs } from './case-law-arango.mjs';

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const rootDir = readArg('--root');

if (!rootDir) {
  console.error('Missing --root. Example: node scripts/import-case-law-to-arango.mjs --root F:\\case-law --reporters us,s-ct');
  process.exit(1);
}

const reporters = parseReporterSlugs(readArg('--reporters'));
const batchSize = Number(readArg('--batch-size') ?? '250');
const dryRun = hasFlag('--dry-run');

const summary = await importCaseLawCorpus({
  rootDir: path.resolve(rootDir),
  reporterSlugs: reporters,
  batchSize: Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 250,
  dryRun,
});

console.log(JSON.stringify(summary, null, 2));
