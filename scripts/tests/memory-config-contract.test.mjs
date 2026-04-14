import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const codexGlobalConfigPath = path.join("C:", "Users", "jwchu", ".codex", "config.toml");
const codexLocalConfigPath = path.join(repoRoot, ".codex", "config.toml");
const startScriptPath = path.join(repoRoot, "scripts", "start-memory-sqlite-http.ps1");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("Codex local config owns project-specific memory MCP definitions", () => {
  const configText = readText(codexLocalConfigPath);

  assert.match(configText, /\[mcp_servers\."memory-sqlite"\]/);
  assert.match(configText, /command = "memory\.exe"/);
  assert.match(configText, /args = \["server"\]/);
  assert.match(configText, /MCP_MEMORY_STORAGE_BACKEND = "sqlite_vec"/);
  assert.match(configText, /MCP_MEMORY_SQLITE_PATH = "_memory\/mcp-memory\.db"/);
  assert.match(configText, /MCP_MEMORY_BACKUPS_PATH = "_memory\/backups"/);
  assert.match(configText, /HF_HOME = "_memory\/hf-home"/);
  assert.match(configText, /TORCH_HOME = "_memory\/torch-home"/);
  assert.match(configText, /SENTENCE_TRANSFORMERS_HOME = "_memory\/sentence-transformers"/);
  assert.doesNotMatch(configText, /http:\/\/127\.0\.0\.1:8765\/mcp/);
  assert.match(configText, /\[mcp_servers\."memory-libsql"\]/);
  assert.match(configText, /LIBSQL_URL = "file:_memory\/libsql\.db"/);
  assert.match(configText, /\[mcp_servers\.openmemory\]/);
  assert.doesNotMatch(configText, /E:\\writing-system/i);
});

test("Codex global config owns the generic sqlite MCP target", () => {
  const configText = readText(codexGlobalConfigPath);

  assert.match(configText, /\[mcp_servers\.sqlite\]/);
  assert.match(configText, /--db-path', 'E:\\backup\\global-memory\.db'/);
});

test("memory sqlite startup script derives repo-local paths instead of hardcoding machine roots", () => {
  const scriptText = readText(startScriptPath);

  assert.match(scriptText, /Split-Path -Parent \$PSScriptRoot/);
  assert.match(scriptText, /Join-Path \$memoryRoot "mcp-memory\.db"/);
  assert.match(scriptText, /Join-Path \$memoryRoot "backups"/);
  assert.match(scriptText, /Join-Path \$memoryRoot "logs"/);
  assert.match(scriptText, /Join-Path \$memoryRoot "hf-home"/);
  assert.match(scriptText, /StartupTimeoutSeconds = 120/);
  assert.match(scriptText, /Test-TcpPort/);
  assert.doesNotMatch(scriptText, /E:\\writing-system/i);
});
