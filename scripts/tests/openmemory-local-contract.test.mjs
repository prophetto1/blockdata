import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const composePath = path.join(repoRoot, "docker", "openmemory", "openmemory-local.compose.yaml");
const ensureScriptPath = path.join(repoRoot, "scripts", "openmemory-local-ensure.ps1");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("openmemory local compose keeps all writable state under repo _memory and avoids qdrant host-port conflicts", () => {
  const composeText = readText(composePath);

  assert.match(composeText, /DATABASE_URL:\s+sqlite:\/\/\/\/openmemory-data\/api\/openmemory\.db/);
  assert.match(composeText, /\$\{WRITING_SYSTEM_ROOT_DOCKER\}\/_memory\/openmemory\/qdrant:\/mem0\/storage/);
  assert.match(composeText, /\$\{WRITING_SYSTEM_ROOT_DOCKER\}\/_memory\/openmemory:\/openmemory-data/);
  assert.match(composeText, /"8766:8765"/);
  assert.doesNotMatch(composeText, /"6333:6333"/);
  assert.match(composeText, /NEXT_PUBLIC_API_URL:\s+\$\{OPENMEMORY_PUBLIC_API_URL\}/);
});

test("openmemory ensure script requires a parameterized source repo and materializes repo-local data directories", () => {
  const scriptText = readText(ensureScriptPath);

  assert.match(scriptText, /\[string\]\$OpenMemoryRepoRoot = \$env:OPENMEMORY_REPO_ROOT/);
  assert.match(scriptText, /throw "OpenMemory source repo root is required/);
  assert.match(scriptText, /Join-Path \$memoryRoot "openmemory"/);
  assert.match(scriptText, /Join-Path \$openMemoryDataRoot "qdrant"/);
  assert.match(scriptText, /Join-Path \$openMemoryDataRoot "api"/);
  assert.match(scriptText, /\$env:WRITING_SYSTEM_ROOT_DOCKER/);
  assert.match(scriptText, /\$env:OPENMEMORY_REPO_ROOT_DOCKER/);
  assert.match(scriptText, /Test-TcpPort -Port \$Port/);
  assert.doesNotMatch(scriptText, /I:\\mem0\\openmemory/i);
});
