import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const statusScriptPath = path.join(repoRoot, 'scripts', 'mastra-local-status.ps1');
const ensureScriptPath = path.join(repoRoot, 'scripts', 'mastra-local-ensure.ps1');
const runtimeDockerfileTemplatePath = path.join(repoRoot, 'scripts', 'mastra-runtime-container.Dockerfile');
const runtimeDockerignoreTemplatePath = path.join(repoRoot, 'scripts', 'mastra-runtime-container.dockerignore');
const runtimeComposeTemplatePath = path.join(repoRoot, 'scripts', 'mastra-runtime-container.compose.yaml');
const resetDocPath = path.join(repoRoot, 'docs', 'infra', 'mastra-local-bootstrap-reset-2026-04-12.md');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('root package exposes local mastra bootstrap scripts', () => {
  const packageJson = JSON.parse(readText(packageJsonPath));
  const scripts = packageJson.scripts ?? {};

  assert.equal(
    scripts['mastra-local:status'],
    'powershell -ExecutionPolicy Bypass -File scripts/mastra-local-status.ps1',
  );
  assert.equal(
    scripts['mastra-local:ensure'],
    'powershell -ExecutionPolicy Bypass -File scripts/mastra-local-ensure.ps1',
  );
});

test('mastra local status script follows the current upstream layout contract', () => {
  const scriptText = readText(statusScriptPath);

  assert.match(scriptText, /\.dev\\docker-compose\.yaml/);
  assert.match(scriptText, /examples\\agent/);
  assert.match(scriptText, /mastra-runtime/);
  assert.match(scriptText, /4111/);
  assert.match(scriptText, /OPENAI_API_KEY/);
  assert.match(scriptText, /pnpm-lock\.yaml/);
  assert.match(scriptText, /overrides/);
  assert.match(scriptText, /link:/);
  assert.match(scriptText, /Dockerfile/);
  assert.match(scriptText, /mastra-runtime/);
  assert.match(scriptText, /docker ps/);
});

test('mastra local ensure script bootstraps current upstream prerequisites', () => {
  const scriptText = readText(ensureScriptPath);

  assert.match(scriptText, /robocopy/);
  assert.match(scriptText, /docker compose/);
  assert.match(scriptText, /pnpm install/);
  assert.match(scriptText, /mastra:dev/);
  assert.match(scriptText, /examples\\agent/);
  assert.match(scriptText, /package\.json/);
  assert.match(scriptText, /overrides/);
  assert.match(scriptText, /UTF8Encoding\(\$false\)/);
  assert.match(scriptText, /container_name/);
  assert.match(scriptText, /Dockerfile/);
  assert.match(scriptText, /dockerignore/);
  assert.match(scriptText, /\.env/);
});

test('container templates exist for the standalone runtime image', () => {
  assert.ok(fs.existsSync(runtimeDockerfileTemplatePath));
  assert.ok(fs.existsSync(runtimeDockerignoreTemplatePath));
  assert.ok(fs.existsSync(runtimeComposeTemplatePath));

  assert.match(readText(runtimeDockerfileTemplatePath), /pnpm/);
  assert.match(readText(runtimeDockerfileTemplatePath), /mastra:dev/);
  assert.match(readText(runtimeDockerfileTemplatePath), /HOST=0\.0\.0\.0/);
  assert.match(readText(runtimeComposeTemplatePath), /mastra-runtime/);
  assert.match(readText(runtimeComposeTemplatePath), /container_name/);
  assert.match(readText(runtimeComposeTemplatePath), /Dockerfile/);
  assert.match(readText(runtimeDockerignoreTemplatePath), /node_modules/);
});

test('bootstrap reset doc exists as the clean-slate source of truth', () => {
  const docText = readText(resetDocPath);

  assert.match(docText, /Canonical runtime target: containerized standalone runtime copy/);
  assert.match(docText, /I:\\mastra/);
  assert.match(docText, /I:\\mastra-runtime\\examples-agent/);
  assert.match(docText, /\.dev\\docker-compose\.yaml/);
  assert.match(docText, /pnpm\.overrides/);
  assert.match(docText, /mastra-runtime/);
  assert.match(docText, /Dockerfile/);
  assert.match(docText, /localhost:4111/);
});
