import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(repoRoot, '.env');

export function loadEnvFile(filePath = envPath, targetEnv = process.env) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || targetEnv[key]) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    targetEnv[key] = value;
  }

  return true;
}

function run(command, { allowFailure = false } = {}) {
  const result = spawnSync(command, {
    cwd: repoRoot,
    env: process.env,
    shell: true,
    stdio: 'inherit',
  });

  const exitCode = result.status ?? 1;
  if (!allowFailure && exitCode !== 0) {
    process.exit(exitCode);
  }

  return exitCode;
}

export function resolveProjectRef(env = process.env) {
  return env.SUPABASE_PROJECT_REF || env.SUPABASE_PROJECT_ID || '';
}

export function canRunRemoteApply(env = process.env) {
  return env.GITHUB_ACTIONS === 'true' || env.CI === 'true';
}

function ensureProjectRef() {
  const projectRef = resolveProjectRef(process.env);
  if (!projectRef) {
    console.error('Missing SUPABASE_PROJECT_REF (or SUPABASE_PROJECT_ID) for remote Supabase operations.');
    process.exit(1);
  }

  return projectRef;
}

function ensureRemoteApplyAllowed() {
  if (canRunRemoteApply(process.env)) {
    return;
  }

  console.error(
    [
      'Remote Supabase apply is CI-only in this repo.',
      'Use `npm run ci:supabase-preflight` and `npm run ci:supabase-status` locally,',
      'then let `.github/workflows/supabase-db-deploy.yml` run `npm run ci:supabase-apply-pending` on master.',
    ].join(' '),
  );
  process.exit(1);
}

function ensureLocalStack() {
  const statusExit = run('npx supabase status', { allowFailure: true });
  if (statusExit === 0) {
    return;
  }

  run('npx supabase start');
}

function runPreflight() {
  ensureLocalStack();
  run('npx supabase db reset');
  run('npm run test:workflow-guardrails');
  run('npm run test:supabase-extension-replay-guardrails');
  run('npm run test:supabase-migration-reconciliation-contract');
}

function runStatus() {
  const projectRef = ensureProjectRef();
  run(`npx supabase link --project-ref ${projectRef}`);
  run('npx supabase migration list');
}

function runApplyPending() {
  ensureRemoteApplyAllowed();
  const projectRef = ensureProjectRef();
  runPreflight();
  run(`npx supabase link --project-ref ${projectRef}`);
  run('npx supabase migration list');
  run('npx supabase db push');
  run('npx supabase migration list');
}

function main() {
  loadEnvFile();
  const mode = process.argv[2];

  if (mode === 'preflight') {
    runPreflight();
    return;
  }

  if (mode === 'status') {
    runStatus();
    return;
  }

  if (mode === 'apply-pending') {
    runApplyPending();
    return;
  }

  console.error('Usage: node scripts/supabase-migration-control.mjs <preflight|status|apply-pending>');
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
