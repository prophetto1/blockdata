import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = 'e:/writing-system';

function readWorkflow(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `Missing workflow: ${relativePath}`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('db validation workflow enforces PR migration verification', () => {
  const workflow = readWorkflow('.github/workflows/supabase-db-validate.yml');

  assert.match(workflow, /pull_request:/, 'workflow must run on pull requests');
  assert.match(workflow, /supabase\/migrations\/\*\*/, 'workflow must watch migration changes');
  assert.match(workflow, /supabase\/setup-cli@v1/, 'workflow must install the Supabase CLI');
  assert.match(workflow, /supabase db start/, 'workflow must start the local Supabase stack');
  assert.match(workflow, /supabase db reset/, 'workflow must replay migrations locally');
});

test('db deploy workflow auto-applies migrations on master', () => {
  const workflow = readWorkflow('.github/workflows/supabase-db-deploy.yml');

  assert.match(workflow, /push:/, 'workflow must run on push');
  assert.match(workflow, /branches:\s*\[master\]/, 'workflow must target master');
  assert.match(workflow, /supabase\/migrations\/\*\*/, 'workflow must watch migration changes');
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN:/, 'workflow must require a Supabase access token secret');
  assert.match(workflow, /SUPABASE_DB_PASSWORD:/, 'workflow must require a Supabase database password secret');
  assert.match(workflow, /SUPABASE_PROJECT_ID:/, 'workflow must require a Supabase project id secret');
  assert.match(workflow, /supabase link --project-ref/, 'workflow must link the remote project');
  assert.match(workflow, /supabase db push/, 'workflow must push migrations to the remote project');
});

test('migration hygiene workflow prevents rewriting existing migration history', () => {
  const workflow = readWorkflow('.github/workflows/migration-history-hygiene.yml');

  assert.match(workflow, /Immutable migration history/, 'workflow must guard immutable migration history');
  assert.match(workflow, /git diff --name-status/, 'workflow must inspect migration file changes');
  assert.match(workflow, /Only new migration files may be added/, 'workflow must reject modified or deleted migrations');
});
