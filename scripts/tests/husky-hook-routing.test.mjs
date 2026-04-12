import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

async function loadRoutingModules() {
  const [changedFilesModule, hookGroupsModule] = await Promise.all([
    import('../husky/changed-files.mjs').catch(() => ({})),
    import('../husky/hook-groups.mjs').catch(() => ({})),
  ]);

  return {
    parsePrePushLines: changedFilesModule.parsePrePushLines,
    getChangedFilesForPushLines: changedFilesModule.getChangedFilesForPushLines,
    HOOK_FAMILIES: hookGroupsModule.HOOK_FAMILIES,
    selectHookGroups: hookGroupsModule.selectHookGroups,
  };
}

function selectedIds(selectedGroups) {
  return selectedGroups.map((group) => group.id).sort();
}

function currentHeadSha() {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
}

test('defines the 15 locked hook families', async () => {
  const { HOOK_FAMILIES } = await loadRoutingModules();
  assert.ok(Array.isArray(HOOK_FAMILIES), 'HOOK_FAMILIES must be exported as an array');
  assert.equal(HOOK_FAMILIES.length, 15, 'expected the 15 locked hook families');
});

test('selects frontend pre-commit families for staged web changes', async () => {
  const { selectHookGroups } = await loadRoutingModules();
  assert.equal(typeof selectHookGroups, 'function', 'selectHookGroups must be exported');

  const selected = selectHookGroups({
    stage: 'pre-commit',
    changedPaths: ['web/src/pages/PipelineServicesPage.tsx'],
  });

  assert.deepEqual(selectedIds(selected), [
    'frontend-build-safety',
    'hardcoded-paths',
    'repo-metadata-cleanup',
    'secret-scan',
  ]);

  const repoMetadataCleanup = selected.find((group) => group.id === 'repo-metadata-cleanup');
  assert.ok(repoMetadataCleanup, 'expected repo-metadata-cleanup group to be selected');
  assert.deepEqual(repoMetadataCleanup.commands, [
    'node _collaborate/scripts/repo-hygiene/remove-desktop-ini.mjs --write --staged',
  ]);
});

test('selects migration guardrails and protected push for migration changes', async () => {
  const { selectHookGroups } = await loadRoutingModules();
  assert.equal(typeof selectHookGroups, 'function', 'selectHookGroups must be exported');

  const selected = selectHookGroups({
    stage: 'pre-push',
    changedPaths: ['supabase/migrations/20260407010101_example.sql'],
  });

  assert.deepEqual(selectedIds(selected), [
    'protected-push',
    'supabase-workflow-guardrails',
  ]);
});

test('selects provider/model family without agchain focus-sync for provider page changes', async () => {
  const { selectHookGroups } = await loadRoutingModules();
  assert.equal(typeof selectHookGroups, 'function', 'selectHookGroups must be exported');

  const selected = selectHookGroups({
    stage: 'pre-push',
    changedPaths: ['web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.tsx'],
  });

  assert.deepEqual(selectedIds(selected), [
    'agchain-provider-model-surfaces',
    'frontend-build-safety',
    'protected-push',
  ]);
});

test('parses pre-push stdin lines and diffs remote-to-local ranges', async () => {
  const { parsePrePushLines, getChangedFilesForPushLines } = await loadRoutingModules();
  assert.equal(typeof parsePrePushLines, 'function', 'parsePrePushLines must be exported');
  assert.equal(typeof getChangedFilesForPushLines, 'function', 'getChangedFilesForPushLines must be exported');

  const lines = parsePrePushLines(`
refs/heads/feature/test 1111111111111111111111111111111111111111 refs/heads/feature/test 2222222222222222222222222222222222222222
`);

  const diffCalls = [];
  const changedPaths = getChangedFilesForPushLines(lines, {
    execFileSyncImpl(command, args) {
      diffCalls.push([command, args]);
      return Buffer.from('scripts/husky/hook-groups.mjs\n');
    },
  });

  assert.deepEqual(lines, [
    {
      localRef: 'refs/heads/feature/test',
      localSha: '1111111111111111111111111111111111111111',
      remoteRef: 'refs/heads/feature/test',
      remoteSha: '2222222222222222222222222222222222222222',
    },
  ]);
  assert.deepEqual(changedPaths, ['scripts/husky/hook-groups.mjs']);
  assert.deepEqual(diffCalls, [[
    'git',
    ['diff', '--name-only', '2222222222222222222222222222222222222222..1111111111111111111111111111111111111111'],
  ]]);
});

test('passes pre-push stdin through the routed runner so protected pushes still block', () => {
  const headSha = currentHeadSha();
  const result = spawnSync(process.execPath, ['scripts/husky/hook-runner.mjs', 'pre-push'], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: `HEAD ${headSha} refs/heads/master ${headSha}\n`,
  });

  assert.notEqual(result.status, 0, 'expected routed pre-push to block master pushes');
  assert.match(result.stderr, /pushes to refs\/heads\/master are blocked/i);
});

test('does not diff invalid delete ranges when routing pre-push families', async () => {
  const { parsePrePushLines, getChangedFilesForPushLines } = await loadRoutingModules();
  assert.equal(typeof parsePrePushLines, 'function', 'parsePrePushLines must be exported');
  assert.equal(typeof getChangedFilesForPushLines, 'function', 'getChangedFilesForPushLines must be exported');

  const lines = parsePrePushLines(`
(delete) 0000000000000000000000000000000000000000 refs/heads/feature/test ${currentHeadSha()}
`);

  let calledGit = false;
  const changedPaths = getChangedFilesForPushLines(lines, {
    execFileSyncImpl() {
      calledGit = true;
      throw new Error('delete pushes should not diff file ranges');
    },
  });

  assert.deepEqual(changedPaths, []);
  assert.equal(calledGit, false);
});

test('resolves frontend lint to the changed files instead of linting the whole workspace', async () => {
  const { selectHookGroups } = await loadRoutingModules();
  assert.equal(typeof selectHookGroups, 'function', 'selectHookGroups must be exported');

  const selected = selectHookGroups({
    stage: 'pre-commit',
    changedPaths: ['web/src/pages/PipelineServicesPage.tsx'],
  });
  const frontendBuildSafety = selected.find((group) => group.id === 'frontend-build-safety');

  assert.ok(frontendBuildSafety, 'expected frontend-build-safety group to be selected');
  assert.deepEqual(frontendBuildSafety.commands, [
    'cd web && npx eslint src/pages/PipelineServicesPage.tsx',
  ]);
});

test('keeps full desktop.ini sweeps on post-merge cleanup hooks', async () => {
  const { selectHookGroups } = await loadRoutingModules();
  assert.equal(typeof selectHookGroups, 'function', 'selectHookGroups must be exported');

  const selected = selectHookGroups({
    stage: 'post-merge',
    changedPaths: [],
  });
  const repoMetadataCleanup = selected.find((group) => group.id === 'repo-metadata-cleanup');

  assert.ok(repoMetadataCleanup, 'expected repo-metadata-cleanup group to be selected');
  assert.deepEqual(repoMetadataCleanup.commands, [
    'node _collaborate/scripts/repo-hygiene/remove-desktop-ini.mjs --write',
  ]);
});
