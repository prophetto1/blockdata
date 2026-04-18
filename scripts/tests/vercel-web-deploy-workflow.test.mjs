import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('package contracts include the Vercel web deploy workflow check', () => {
  const pkg = JSON.parse(read('package.json'));
  const scripts = pkg.scripts ?? {};

  assert.equal(
    scripts['test:vercel-web-deploy-workflow'],
    'node --test scripts/tests/vercel-web-deploy-workflow.test.mjs',
    'package.json must expose the Vercel workflow contract test',
  );
  assert.match(
    scripts['ci:contracts'] ?? '',
    /test:vercel-web-deploy-workflow/,
    'ci:contracts must include the Vercel workflow contract test',
  );
});

test('vercel web deploy workflow is repo-owned and production-scoped', () => {
  const workflow = read('.github/workflows/vercel-web-deploy.yml');

  assert.match(workflow, /name:\s*Deploy Web To Vercel/, 'workflow must have the expected name');
  assert.match(workflow, /push:/, 'workflow must run on push');
  assert.match(workflow, /branches:\s*\[master\]/, 'workflow must target master');
  assert.match(workflow, /web\/\*\*/, 'workflow must watch web changes');
  assert.match(workflow, /web\/\.vercel\/\*\*/, 'workflow must watch checked-in web Vercel linkage');
  assert.match(workflow, /workflow_dispatch:/, 'workflow must support manual dispatch');
  assert.match(workflow, /actions\/setup-node@v4/, 'workflow must install Node');
  assert.match(workflow, /npm ci/, 'workflow must install dependencies from the repo root');
  assert.match(workflow, /npm run ci:frontend/, 'workflow must reuse the repo-owned frontend build contract');
  assert.match(workflow, /VERCEL_TOKEN:\s*\$\{\{\s*secrets\.VERCEL_TOKEN\s*\}\}/, 'workflow must require the Vercel token secret');
  assert.match(workflow, /web\/\.vercel\/project\.json/, 'workflow must derive linkage from the checked-in web Vercel project file');
  assert.match(workflow, /vercel@latest pull --yes --environment=production/, 'workflow must pull production config');
  assert.match(workflow, /vercel@latest build --prod/, 'workflow must build through Vercel CLI');
  assert.match(workflow, /vercel@latest deploy --prebuilt --prod/, 'workflow must deploy the prebuilt output');
  assert.match(workflow, /id:\s*deploy/, 'workflow must capture the production deploy step output');
  assert.match(workflow, /PRODUCTION_URL:\s*https:\/\/blockdata\.run/, 'workflow must smoke-check the official production domain');
  assert.match(workflow, /BlockData/, 'workflow smoke verification must assert the production shell marker');
});

test('web vercel config disables direct master git deployments', () => {
  const config = JSON.parse(read('web/vercel.json'));

  assert.equal(
    config.git?.deploymentEnabled?.master,
    false,
    'web/vercel.json must disable direct Vercel Git deployments for master so production flows through the repo-owned workflow',
  );
});
