import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('package.json exposes repo-owned Supabase migration control commands', () => {
  const pkg = JSON.parse(read('package.json'));
  const scripts = pkg.scripts ?? {};

  assert.equal(
    scripts['ci:supabase-preflight'],
    'node scripts/supabase-migration-control.mjs preflight',
    'ci:supabase-preflight must point at the repo-owned migration control script',
  );
  assert.equal(
    scripts['ci:supabase-status'],
    'node scripts/supabase-migration-control.mjs status',
    'ci:supabase-status must point at the repo-owned migration control script',
  );
  assert.equal(
    scripts['ci:supabase-apply-pending'],
    'node scripts/supabase-migration-control.mjs apply-pending',
    'ci:supabase-apply-pending must point at the repo-owned migration control script',
  );
});

test('husky Supabase guardrail group runs the repo-owned preflight wrapper', () => {
  const hookGroups = read('scripts/husky/hook-groups.mjs');

  assert.match(
    hookGroups,
    /id:\s*'supabase-workflow-guardrails'/,
    'supabase guardrail group must exist',
  );
  assert.match(
    hookGroups,
    /npm run ci:supabase-preflight/,
    'supabase guardrail group must run the repo-owned preflight wrapper',
  );
  assert.match(
    hookGroups,
    /scripts\/supabase-migration-control\.mjs/,
    'supabase guardrail group must watch the repo-owned migration control script',
  );
  assert.match(
    hookGroups,
    /scripts\/tests\/supabase-migration-control\.test\.mjs/,
    'supabase guardrail group must watch the migration control unit tests',
  );
});

test('CI\/CD home documents the repo-owned Supabase command surface', () => {
  const readme = read('docs/infra/cicd/README.md');

  assert.match(readme, /npm run ci:supabase-preflight/, 'README must document local Supabase preflight');
  assert.match(readme, /npm run ci:supabase-status/, 'README must document remote status check');
  assert.match(readme, /npm run ci:supabase-apply-pending/, 'README must document the apply path');
  assert.match(readme, /CI-only/i, 'README must explain that remote apply is CI-only by default');
});
