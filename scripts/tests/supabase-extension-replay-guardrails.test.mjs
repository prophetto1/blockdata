import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = 'e:/writing-system';
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');
const rawPgcryptoCreatePattern = /^\s*create extension if not exists pgcrypto\s*;/im;
const allowedBootstrapMigration = '20260202102234_001_phase1_immutable_documents_blocks.sql';

test('only the bootstrap migration may issue a raw pgcrypto create statement', () => {
  const offendingFiles = fs
    .readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith('.sql'))
    .filter((fileName) => {
      const migrationSql = fs.readFileSync(path.join(migrationsDir, fileName), 'utf8');
      return rawPgcryptoCreatePattern.test(migrationSql);
    })
    .sort();

  assert.deepEqual(
    offendingFiles,
    [allowedBootstrapMigration],
    `Later migrations must not reissue raw pgcrypto creates: ${offendingFiles.join(', ')}`
  );
});
