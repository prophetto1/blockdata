# MCP Server Configuration Audit

**Date:** 2026-04-08
**Scope:** Claude Code MCP loading across all configuration layers
**Platform:** Windows 11, Antigravity IDE (VSCode fork), Claude Code with `claude-vscode` entrypoint

---

## Current Correct State

Claude Code reads MCP server definitions from three layers. Each layer serves a different scope. All three must be correctly configured for servers to load.

### Layer 1: Project-Level Servers (`e:\writing-system\.mcp.json`)

This file defines servers scoped to the `writing-system` project. Claude Code spawns these servers when a session opens in this directory.

| Server | Transport | Command / URL |
|---|---|---|
| `memory` | stdio | `npx -y @modelcontextprotocol/server-memory` |
| `sequential-thinking` | stdio | `npx -y @modelcontextprotocol/server-sequential-thinking` |
| `context7` | stdio | `npx -y @upstash/context7-mcp@latest` |
| `ark-ui` | stdio | `npx -y @ark-ui/mcp` |
| `supabase` | stdio | `npx -y @supabase/mcp-server-supabase --project-ref dbdzzhshmigewyprahej` |
| `playwright` | stdio | `npx -y @playwright/mcp@latest` |
| `duckdb` | stdio | `mcp-server-motherduck.exe --db-path ...legal10-updates.duckdb --read-only` |
| `memory-sqlite` | stdio | `memory.exe server` (sqlite_vec backend) |
| `memory-libsql` | stdio | `npx -y mcp-memory-libsql` |
| `sqlite` | stdio | `mcp-server-sqlite.exe --db-path ...sandbox.db` |
| `openaiDeveloperDocs` | http | `https://developers.openai.com/mcp` |

**Total: 11 servers.** Three use local `.exe` binaries; seven use `npx`; one uses an HTTP endpoint.

### Layer 2: User-Level Servers (`C:\Users\jwchu\.claude.json` > `mcpServers`)

This file defines servers available to every Claude Code session regardless of project. Claude Code reads the top-level `mcpServers` key.

| Server | Transport | Command |
|---|---|---|
| `sequential-thinking` | stdio | `npx -y @modelcontextprotocol/server-sequential-thinking` |
| `context7` | stdio | `node .../npm/node_modules/@upstash/context7-mcp/dist/index.js` |
| `exa` | stdio | `npx -y exa-mcp-server` |
| `perplexity-ask` | stdio | `npx -y server-perplexity-ask` |
| `supabase` | stdio | `npx -y @supabase/mcp-server-supabase --project-ref dbdzzhshmigewyprahej` |
| `playwright` | stdio | `npx -y @playwright/mcp@latest` |
| `analytical` | stdio | `node .../analytical-mcp/build/index.js` |
| `memory` | stdio | `npx -y @modelcontextprotocol/server-memory` |
| `shadcn` | stdio | `npx -y shadcn-ui-mcp-server` |
| `ark-ui` | stdio | `cmd.exe /c npx -y @ark-ui/mcp` |
| `hugeicons` | stdio | `npx -y @hugeicons/mcp-server` |

**Total: 11 servers.** All use explicit `"type": "stdio"`. Six names overlap with Layer 1 (`memory`, `sequential-thinking`, `context7`, `ark-ui`, `supabase`, `playwright`). Five are unique to this layer (`exa`, `perplexity-ask`, `analytical`, `shadcn`, `hugeicons`). Five in Layer 1 are unique to that layer (`duckdb`, `memory-sqlite`, `memory-libsql`, `sqlite`, `openaiDeveloperDocs`).

### Layer 3: Project Trust Gate (`C:\Users\jwchu\.claude.json` > `projects`)

Before Claude Code loads any Layer 1 server, it checks the `projects` entry matching the current working directory. The entry for `"E:/writing-system"` reads:

```
enabledMcpjsonServers: ["memory", "sequential-thinking", "context7", "ark-ui",
  "supabase", "playwright", "duckdb", "memory-sqlite", "memory-libsql",
  "sqlite", "openaiDeveloperDocs"]
disabledMcpjsonServers: []
hasTrustDialogAccepted: true
```

All 11 Layer 1 server names appear in the enabled list. None are disabled. Trust is accepted.

### Dead Configuration (`C:\Users\jwchu\.claude\settings.json` > `mcpServers`)

This file contains a `mcpServers` block defining 12 servers (`analytical`, `memory`, `sequential-thinking`, `context7`, `shadcn`, `ark-ui`, `supabase`, `playwright`, `Mintlify`, `vercel`, `hugeicons`, `figma`). **Claude Code does not read `mcpServers` from this file.** The key is recognized only in `~/.claude.json` (Layer 2) and `.mcp.json` (Layer 1). These 12 definitions have no effect on any session.

### Cloud-Account Servers

Three servers (`claude.ai Figma`, `claude.ai Supabase`, `claude.ai Vercel`) load from the user's claude.ai account. They require no local configuration. They appear in every session alongside the locally defined servers.

---

## Incident: All Project MCP Servers Failed to Load

**Observed:** 2026-04-08, starting before 14:00 UTC+7.
**Symptom:** The Claude Code IDE session displayed only 3 connected MCP servers (the cloud-account servers). All 11 project-level and all user-level servers were absent. Creating a new project showed the same 3 servers.

### Root Cause 1: Duplicate Project Entry (Layer 3)

`~/.claude.json` contained two entries for the same directory under `projects`:

| Key | `enabledMcpjsonServers` |
|---|---|
| `"E:/writing-system"` (forward slashes) | all 11 server names |
| `"E:\\writing-system"` (backslashes) | `[]` (empty) |

Claude Code matched the backslash-form key. The empty enable list blocked every `.mcp.json` server. The backslash-form entry was written between 14:00 and 14:13 by the running Claude Code session itself. The harness serialized the current working directory with Windows-native backslash separators instead of normalizing to the forward-slash form already present.

**Resolution:** Deleted the backslash-form entry from `~/.claude.json`. Backup created at `.claude.json.bak-pre-duplicate-fix-20260408-1444`.

### Root Cause 2: User-Level Servers in Wrong File (Layer 2)

Twelve MCP servers were defined under `mcpServers` in `~/.claude/settings.json`. Claude Code does not read that key from `settings.json`. The servers (`analytical`, `shadcn`, `hugeicons`, `Mintlify`, `vercel`, `figma`, and six others) never loaded in any session.

**Resolution:** Moved the server definitions into `~/.claude.json` under the top-level `mcpServers` key, where Claude Code reads them. Added `"type": "stdio"` to each definition. Added two new servers (`exa`, `perplexity-ask`) at the same time. The `Mintlify`, `vercel`, and `figma` URL-based servers were not carried over (their function is covered by the cloud-account servers).

### Root Cause 3: No Debug Visibility (Diagnostic Gap)

The `claude-vscode` IDE entrypoint does not write MCP startup attempts to `~/.claude/debug/`. Debug logs exist only from earlier CLI sessions. No log entry recorded the failure to load project servers, the duplicate-key collision, or the ignored `settings.json` config. Diagnosis required manual file inspection.

---

## Configuration Files Reference

| File | Location | What Claude Code reads from it |
|---|---|---|
| `.mcp.json` | Project root | `mcpServers` (project-scoped servers) |
| `~/.claude.json` | `C:\Users\jwchu\.claude.json` | `mcpServers` (user-scoped servers), `projects` (trust/enable gates) |
| `~/.claude/settings.json` | `C:\Users\jwchu\.claude\settings.json` | `permissions`, `additionalDirectories`, `effortLevel` -- **not** `mcpServers` |
| `.claude/settings.json` | Project `.claude\settings.json` | `permissions` (project-scoped) |
| `.claude/settings.local.json` | Project `.claude\settings.local.json` | `permissions` (local overrides, gitignored) |
