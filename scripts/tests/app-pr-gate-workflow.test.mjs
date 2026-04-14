import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function readWorkflow(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `Missing workflow: ${relativePath}`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('app PR gate workflow enforces the locked Phase 1 contract', () => {
  const workflow = readWorkflow('.github/workflows/app-pr-gate.yml');

  assert.match(workflow, /^name:\s*App PR Gate$/m, 'workflow must expose the locked check name');
  assert.match(workflow, /^on:\s*$/m, 'workflow must declare triggers explicitly');
  assert.match(workflow, /^\s+pull_request:\s*$/m, 'workflow must run on pull requests');
  assert.match(workflow, /^\s+workflow_dispatch:\s*$/m, 'workflow must expose workflow_dispatch');
  assert.match(workflow, /^\s+runs-on:\s*ubuntu-latest$/m, 'workflow must use ubuntu-latest');

  assert.match(workflow, /^\s+repo-contracts:\s*$/m, 'workflow must expose the repo-contracts job');
  assert.match(workflow, /^\s+name:\s*repo-contracts$/m, 'repo-contracts job name must stay stable');
  assert.match(workflow, /^\s+frontend-build:\s*$/m, 'workflow must expose the frontend-build job');
  assert.match(workflow, /^\s+name:\s*frontend-build$/m, 'frontend-build job name must stay stable');
  assert.match(workflow, /^\s+platform-api-pytest:\s*$/m, 'workflow must expose the platform-api-pytest job');
  assert.match(workflow, /^\s+name:\s*platform-api-pytest$/m, 'platform-api-pytest job name must stay stable');

  assert.match(workflow, /actions\/checkout@v4/, 'workflow must check out the repo');
  assert.match(workflow, /actions\/setup-node@v4/, 'workflow must set up Node');
  assert.match(workflow, /node-version:\s*24/, 'workflow must pin Node 24');
  assert.match(workflow, /npm ci/, 'workflow must install root dependencies with npm ci');
  assert.match(workflow, /actions\/setup-python@v5/, 'backend job must set up Python');
  assert.match(workflow, /python-version:\s*['"]3\.11['"]/, 'backend job must pin Python 3.11');
  assert.match(workflow, /python -m pip install --upgrade pip/, 'backend job must upgrade pip');
  assert.match(
    workflow,
    /pip install -r services\/platform-api\/requirements\.txt/,
    'backend job must install platform-api requirements'
  );

  assert.match(workflow, /npm run ci:contracts/, 'workflow must call the repo contract wrapper');
  assert.match(workflow, /npm run ci:frontend/, 'workflow must call the frontend wrapper');
  assert.match(workflow, /npm run ci:platform-api/, 'workflow must call the backend wrapper');
  assert.match(workflow, /needs:\s*repo-contracts/, 'app verification jobs must wait for repo-contracts');

  assert.doesNotMatch(
    workflow,
    /npm run test:workflow-guardrails/,
    'workflow must keep leaf contract tests behind ci:contracts'
  );
  assert.doesNotMatch(
    workflow,
    /node --test scripts\/tests\/app-pr-gate-workflow\.test\.mjs/,
    'workflow must keep the leaf app PR gate test behind ci:contracts'
  );
  assert.doesNotMatch(
    workflow,
    /npm --workspace web run build/,
    'workflow must keep the frontend leaf command behind ci:frontend'
  );
  assert.doesNotMatch(
    workflow,
    /pytest -q services\/platform-api\/tests/,
    'workflow must keep the backend leaf command behind ci:platform-api'
  );
});
