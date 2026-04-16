import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { canRunRemoteApply, loadEnvFile, resolveProjectRef } from '../supabase-migration-control.mjs';

test('loadEnvFile hydrates env values from .env without overwriting existing keys', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'supabase-migration-control-'));
  const tempEnvPath = path.join(tempDir, '.env');

  fs.writeFileSync(
    tempEnvPath,
    [
      'SUPABASE_PROJECT_REF=dbdzzhshmigewyprahej',
      'SUPABASE_PROJECT_ID=remote-project-id',
    ].join('\n'),
    'utf8',
  );

  const env = { SUPABASE_PROJECT_ID: 'already-set-project-id' };
  const loaded = loadEnvFile(tempEnvPath, env);

  assert.equal(loaded, true);
  assert.equal(env.SUPABASE_PROJECT_REF, 'dbdzzhshmigewyprahej');
  assert.equal(env.SUPABASE_PROJECT_ID, 'already-set-project-id');
});

test('resolveProjectRef prefers SUPABASE_PROJECT_REF and falls back to SUPABASE_PROJECT_ID', () => {
  assert.equal(resolveProjectRef({ SUPABASE_PROJECT_REF: 'ref-value', SUPABASE_PROJECT_ID: 'id-value' }), 'ref-value');
  assert.equal(resolveProjectRef({ SUPABASE_PROJECT_ID: 'id-value' }), 'id-value');
  assert.equal(resolveProjectRef({}), '');
});

test('canRunRemoteApply allows CI contexts only', () => {
  assert.equal(canRunRemoteApply({}), false);
  assert.equal(canRunRemoteApply({ CI: 'true' }), true);
  assert.equal(canRunRemoteApply({ GITHUB_ACTIONS: 'true' }), true);
});
