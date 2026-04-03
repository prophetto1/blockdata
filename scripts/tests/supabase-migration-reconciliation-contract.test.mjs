import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const LOCAL_TEST_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

function getConnectionString() {
  return process.env.TEST_DATABASE_URL || LOCAL_TEST_DATABASE_URL;
}

function getSslConfig(connectionString) {
  if (
    connectionString.includes('127.0.0.1') ||
    connectionString.includes('localhost')
  ) {
    return false;
  }

  return { rejectUnauthorized: false };
}

async function withClient(fn) {
  const connectionString = getConnectionString();
  const client = new pg.Client({
    connectionString,
    ssl: getSslConfig(connectionString),
  });

  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function getRelationState(client) {
  const result = await client.query(`
    SELECT
      to_regclass('public.user_projects')::text AS user_projects,
      to_regclass('public.projects')::text AS projects
  `);
  return result.rows[0];
}

async function getForeignKeyTargets(client) {
  const result = await client.query(`
    SELECT
      c.conname AS constraint_name,
      src.relname AS source_table,
      tgt.relname AS target_table
    FROM pg_constraint c
    JOIN pg_class src ON src.oid = c.conrelid
    JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
    JOIN pg_class tgt ON tgt.oid = c.confrelid
    JOIN pg_namespace tgt_ns ON tgt_ns.oid = tgt.relnamespace
    WHERE c.contype = 'f'
      AND src_ns.nspname = 'public'
      AND tgt_ns.nspname = 'public'
      AND c.conname IN (
        'flow_executions_project_id_fkey',
        'flow_logs_project_id_fkey',
        'extraction_schemas_project_id_fkey'
      )
    ORDER BY c.conname
  `);

  return Object.fromEntries(
    result.rows.map((row) => [row.constraint_name, row.target_table]),
  );
}

async function getPolicies(client) {
  const result = await client.query(`
    SELECT
      schemaname,
      tablename,
      policyname,
      cmd,
      COALESCE(qual, '') AS qual,
      COALESCE(with_check, '') AS with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('flow_executions', 'flow_logs', 'extraction_schemas')
  `);

  return new Map(
    result.rows.map((row) => [
      `${row.tablename}.${row.policyname}`,
      {
        cmd: row.cmd,
        qual: normalize(row.qual),
        withCheck: normalize(row.with_check),
      },
    ]),
  );
}

function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function expectPolicyContains(policies, key, fragment, field = 'qual') {
  const policy = policies.get(key);
  assert.ok(policy, `Expected policy ${key} to exist`);
  assert.match(
    policy[field],
    new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Expected ${field} for ${key} to include ${fragment}`,
  );
}

function expectPolicyMatches(policies, key, pattern, field = 'qual') {
  const policy = policies.get(key);
  assert.ok(policy, `Expected policy ${key} to exist`);
  assert.match(
    policy[field],
    pattern,
    `Expected ${field} for ${key} to match ${pattern}`,
  );
}

test('supabase migration reconciliation contract is satisfied', async () => {
  await withClient(async (client) => {
    const relationState = await getRelationState(client);
    assert.equal(
      relationState.user_projects,
      'user_projects',
      'public.user_projects must exist',
    );
    assert.equal(relationState.projects, null, 'public.projects must not exist');

    const foreignKeys = await getForeignKeyTargets(client);
    assert.equal(
      foreignKeys.flow_executions_project_id_fkey,
      'user_projects',
      'flow_executions FK must target public.user_projects',
    );
    assert.equal(
      foreignKeys.flow_logs_project_id_fkey,
      'user_projects',
      'flow_logs FK must target public.user_projects',
    );
    assert.equal(
      foreignKeys.extraction_schemas_project_id_fkey,
      'user_projects',
      'extraction_schemas FK must target public.user_projects',
    );

    const policies = await getPolicies(client);

    expectPolicyMatches(
      policies,
      'flow_executions.flow_executions_select_own',
      /from (public\.)?user_projects/,
    );
    expectPolicyMatches(
      policies,
      'flow_executions.flow_executions_insert_own',
      /from (public\.)?user_projects/,
      'withCheck',
    );
    expectPolicyMatches(
      policies,
      'flow_executions.flow_executions_update_own',
      /from (public\.)?user_projects/,
    );
    expectPolicyMatches(
      policies,
      'flow_executions.flow_executions_update_own',
      /from (public\.)?user_projects/,
      'withCheck',
    );

    expectPolicyContains(
      policies,
      'flow_logs.flow_logs_select_own',
      'project_id is null',
    );
    expectPolicyMatches(
      policies,
      'flow_logs.flow_logs_select_own',
      /from (public\.)?user_projects/,
    );
    expectPolicyContains(
      policies,
      'flow_logs.flow_logs_select_own',
      'exists',
    );
    expectPolicyContains(
      policies,
      'flow_logs.flow_logs_insert_own',
      'project_id is null',
      'withCheck',
    );
    expectPolicyMatches(
      policies,
      'flow_logs.flow_logs_insert_own',
      /from (public\.)?user_projects/,
      'withCheck',
    );
    expectPolicyContains(
      policies,
      'flow_logs.flow_logs_insert_own',
      'exists',
      'withCheck',
    );
    assert.ok(
      policies.has('flow_logs.flow_logs_service_role'),
      'flow_logs_service_role must exist',
    );

    expectPolicyContains(
      policies,
      'extraction_schemas.extraction_schemas_select_own',
      'owner_id = auth.uid()',
    );
    expectPolicyContains(
      policies,
      'extraction_schemas.extraction_schemas_delete_own',
      'owner_id = auth.uid()',
    );
    expectPolicyMatches(
      policies,
      'extraction_schemas.extraction_schemas_insert_own',
      /from (public\.)?user_projects/,
      'withCheck',
    );
    expectPolicyContains(
      policies,
      'extraction_schemas.extraction_schemas_update_own',
      'owner_id = auth.uid()',
    );
    expectPolicyMatches(
      policies,
      'extraction_schemas.extraction_schemas_update_own',
      /from (public\.)?user_projects/,
      'withCheck',
    );

    assert.equal(
      policies.has('flow_executions.flow_executions_delete_own'),
      false,
      'flow_executions_delete_own must not exist',
    );
    assert.equal(
      policies.has('flow_logs.flow_logs_update_own'),
      false,
      'flow_logs_update_own must not exist',
    );
    assert.equal(
      policies.has('flow_logs.flow_logs_delete_own'),
      false,
      'flow_logs_delete_own must not exist',
    );
  });
});
