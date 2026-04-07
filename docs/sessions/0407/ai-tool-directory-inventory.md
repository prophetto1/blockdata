# AI Tool Directory Inventory

**Date:** 2026-04-07

**Scope:** Read-only investigation of six user-level AI tool directories for skills, MCPs, prompts, tools, configurations, and context provision systems.

**Directories checked:**
- `C:\Users\jwchu\.cursor`
- `C:\Users\jwchu\.gemini`
- `C:\Users\jwchu\.picoclaw`
- `C:\Users\jwchu\.claude`
- `C:\Users\jwchu\.codex`
- `C:\Users\jwchu\.copilot`

---

## .cursor (Cursor IDE)

### Built-in Skills (7)
`C:\Users\jwchu\.cursor\skills-cursor\`
- `babysit\SKILL.md`
- `create-rule\SKILL.md`
- `create-skill\SKILL.md`
- `create-subagent\SKILL.md`
- `migrate-to-skills\SKILL.md`
- `shell\SKILL.md`
- `update-cursor-settings\SKILL.md`

### Plugin Cache (3 downloaded)
`C:\Users\jwchu\.cursor\plugins\cache\cursor-public\`

| Plugin | Path | Notable contents |
|---|---|---|
| context7 | `context7-plugin\58a36cea…\` | `.mcp.json`, plugin.json, 2 tools |
| figma | `figma\d8bcb41b…\` | `.mcp.json`, server.json, 5 skills, 30+ resource docs |
| supabase | `supabase\release_v0.1.3\` | `.mcp.json`, plugin.json, 20+ reference docs |

### Project MCPs — 4 servers
`C:\Users\jwchu\.cursor\projects\e-writing-system\mcps\`

| Server | Path | Tool count |
|---|---|---|
| cursor-ide-browser | `cursor-ide-browser\` | 28 browser tools |
| context7 | `plugin-context7-plugin-context7\` | 2 tools |
| figma | `plugin-figma-figma\` | 13 tools, 61 resources |
| supabase | `plugin-supabase-supabase\` | 30 tools |

### Config
- `C:\Users\jwchu\.cursor\mcp.json` — empty (placeholder)
- `C:\Users\jwchu\.cursor\ide_state.json` — recently viewed files
- `C:\Users\jwchu\.cursor\ai-tracking\ai-code-tracking.db` — SQLite tracking database

---

## .gemini (Gemini / Antigravity IDE)

### MCP Servers (2)
`C:\Users\jwchu\.gemini\antigravity\mcp_config.json`
- sequential-thinking
- CloudRun (Google Cloud)

### Installation ID
`C:\Users\jwchu\.gemini\antigravity\installation_id`

### Context/State

| Directory | Path | Contents |
|---|---|---|
| brain | `C:\Users\jwchu\.gemini\antigravity\brain\` | 5 conversation directories with task checklists, metadata, uploaded media |
| conversations | `C:\Users\jwchu\.gemini\antigravity\conversations\` | 5 protobuf files (~4 MB) — full conversation history |
| implicit | `C:\Users\jwchu\.gemini\antigravity\implicit\` | 5 protobuf files (~828 KB) — inferred context between sessions |
| annotations | `C:\Users\jwchu\.gemini\antigravity\annotations\` | 1 protobuf text annotation |
| knowledge | `C:\Users\jwchu\.gemini\antigravity\knowledge\` | knowledge.lock file |
| context_state | `C:\Users\jwchu\.gemini\antigravity\context_state\` | empty (reserved) |

### Browser Profile
`C:\Users\jwchu\.gemini\antigravity-browser-profile\` — full Chromium profile for autonomous web interaction, screenshot capture, and data extraction.

### No skill marketplace or registry.

---

## .picoclaw (PicoClaw)

### Skills (6)
`C:\Users\jwchu\.picoclaw\workspace\skills\`

| Skill | Path | Purpose |
|---|---|---|
| github | `github\SKILL.md` | GitHub CLI integration (`gh`) |
| hardware | `hardware\SKILL.md` | I2C/SPI peripheral control for Sipeed boards |
| skill-creator | `skill-creator\SKILL.md` | Skill authoring framework |
| summarize | `summarize\SKILL.md` | URL/file/YouTube summarization via `summarize` CLI |
| tmux | `tmux\SKILL.md` | Interactive TTY session control |
| weather | `weather\SKILL.md` | Weather queries via wttr.in and Open-Meteo |

Reference docs: `hardware\references\board-pinout.md`, `hardware\references\common-devices.md`
Scripts: `tmux\scripts\find-sessions.sh`, `tmux\scripts\wait-for-text.sh`

### Config
`C:\Users\jwchu\.picoclaw\config.json`
- 27 LLM providers configured (Anthropic, OpenAI, Google, Deepseek, QWen, Groq, Ollama, Mistral, etc.)
- 14 messaging channels (only `pico` enabled)
- Tools enabled: DuckDuckGo search, cron, shell, file read/write/edit
- Skills registry: ClawhHub (`https://clawhub.ai`) enabled
- MCP: disabled
- Version: 0.2.3

`C:\Users\jwchu\.picoclaw\auth.json` — Google OAuth credentials

### Context/State
- `C:\Users\jwchu\.picoclaw\workspace\IDENTITY.md` — system identity spec
- `C:\Users\jwchu\.picoclaw\workspace\SOUL.md` — personality traits and values
- `C:\Users\jwchu\.picoclaw\workspace\USER.md` — user profile template (unpopulated)
- `C:\Users\jwchu\.picoclaw\workspace\AGENTS.md` — behavioral guidelines
- `C:\Users\jwchu\.picoclaw\workspace\memory\MEMORY.md` — long-term memory template (unpopulated)
- `C:\Users\jwchu\.picoclaw\workspace\sessions\heartbeat.jsonl` — 34 logged heartbeat events
- `C:\Users\jwchu\.picoclaw\workspace\sessions\heartbeat.meta.json` — session metadata
- `C:\Users\jwchu\.picoclaw\workspace\sessions\HEARTBEAT.md` — periodic task checklist
- `C:\Users\jwchu\.picoclaw\workspace\cron\jobs.json` — scheduled tasks (empty)

---

## .claude (Claude Code) — primary harness

### Skills (37)
`C:\Users\jwchu\.claude\skills\`
- `addressing-evaluation-findings\SKILL.md`
- `blind-implementation-review\SKILL.md`
- `brainstorming\SKILL.md`
- `comprehensive-systematic-debugging\SKILL.md` (+ references: root-cause-tracing.md, defense-in-depth.md, condition-based-waiting.md)
- `design-1-layouts-spec-with-playwright\SKILL.md` (+ scripts/)
- `design-2-designing-from-layouts\SKILL.md`
- `design-3-spec-contract-based-design-audit\SKILL.md`
- `design-4-extract-page-spec-contracts\SKILL.md`
- `dispatching-parallel-agents\SKILL.md`
- `evaluating-implemented-plan\SKILL.md`
- `evaluating-plan-before-implementation\SKILL.md`
- `executing-approved-plans\SKILL.md`
- `executing-plans\SKILL.md`
- `finishing-a-development-branch\SKILL.md`
- `frontend-foundation-audit\SKILL.md` (+ references: audit-input-schema.md, report-template.md, search-heuristics.md)
- `investigating-and-writing-plan\SKILL.md`
- `oss-discovery\SKILL.md`
- `receiving-code-review\SKILL.md`
- `repo-compatibility-investigator\SKILL.md` (+ references: output-contract.md)
- `repo-investigator\SKILL.md`
- `repo-investigator-v2.0\SKILL.md` (+ references: output-contract-v1.md)
- `requesting-code-review\SKILL.md`
- `skill-creator\SKILL.md`
- `subagent-driven-development\SKILL.md` (+ references: implementer-prompt.md, spec-reviewer-prompt.md, code-quality-reviewer-prompt.md)
- `systematic-debugging\SKILL.md`
- `taking-over-investigation-and-plan\SKILL.md`
- `test-driven-development\SKILL.md`
- `the-elements-of-style\SKILL.md`
- `using-git-worktrees\SKILL.md`
- `using-superpowers\SKILL.md`
- `validating-skills\SKILL.md`
- `verification-before-completion\SKILL.md`
- `writing-clearly-and-concisely\SKILL.md` (+ references: elements-of-style.md)
- `writing-plans\SKILL.md`
- `writing-skills\SKILL.md` (+ references: anthropic-best-practices.md, testing-skills-with-subagents.md, persuasion-principles.md)
- `writing-frontend-foundation-contract\SKILL.md`
- `DRAFTING-NEW-IMPLEMENTATION-PLANS.md`

### MCP Servers (12)
`C:\Users\jwchu\.claude\settings.json` → `mcpServers` key

| Server | Type | Purpose |
|---|---|---|
| analytical | npm/local | Custom analysis |
| memory | npm | Knowledge graph/memory |
| sequential-thinking | npm | Extended reasoning |
| context7 | npm | Library/framework docs |
| shadcn | npm | shadcn/ui components |
| ark-ui | npm/cmd | Ark UI components |
| supabase | npm | Database/auth management |
| playwright | npm | Browser automation |
| Mintlify | URL | Documentation hosting |
| vercel | URL | Vercel platform |
| hugeicons | npm | Icon library |
| figma | URL | Figma design tool |

### Plugin Marketplace
`C:\Users\jwchu\.claude\plugins\`
- `known_marketplaces.json` — `claude-plugins-official` (GitHub: anthropics/claude-plugins-official)
- `install-counts-cache.json` — 269 plugins indexed
- `blocklist.json` — 2 plugins blocklisted
- `marketplaces\claude-plugins-official\` — downloaded marketplace contents

### Config
- `C:\Users\jwchu\.claude\settings.json` — 140+ permission rules, MCP servers, effort level: max
- `C:\Users\jwchu\.claude\config.json` — Anthropic API key, 8 approved custom keys
- `C:\Users\jwchu\.claude\.credentials.json` — OAuth tokens, org UUID, "max" subscription tier
- `C:\Users\jwchu\.claude\mcp-needs-auth-cache.json` — OAuth status for 23 MCP plugins

### Context/State
- `C:\Users\jwchu\.claude\projects\` — 12 active projects (each with .jsonl sessions, subagents/)
- `C:\Users\jwchu\.claude\plans\` — 100+ named plan files
- `C:\Users\jwchu\.claude\sessions\` — session lock files
- `C:\Users\jwchu\.claude\file-history\` — timestamped file version tracking
- `C:\Users\jwchu\.claude\shell-snapshots\` — bash shell snapshots
- `C:\Users\jwchu\.claude\debug\` — 20+ UUID-named debug logs
- `C:\Users\jwchu\.claude\backups\` — .claude.json configuration backups
- `C:\Users\jwchu\.claude\cache\` — caching layer
- `C:\Users\jwchu\.claude\ide\` — IDE lock files
- `C:\Users\jwchu\.claude\telemetry\` — 100+ telemetry event files

---

## .codex (OpenAI Codex)

### Skills (43)
`C:\Users\jwchu\.codex\skills\`

All `.claude` skills plus additional media/system tools:
- `pdf\SKILL.md`
- `screenshot\SKILL.md`
- `transcribe\SKILL.md`
- `spreadsheet\SKILL.md`
- `slides\SKILL.md`
- `speech\SKILL.md`
- `playwright\SKILL.md`
- `playwright-interactive\SKILL.md`
- `figma\SKILL.md`
- `doc\SKILL.md`
- `openai-docs\SKILL.md`
- `.system\SKILL.md`

### Plugin Cache — 25 OpenAI-curated
`C:\Users\jwchu\.codex\plugins\cache\openai-curated\`

Each plugin at: `<plugin-name>\<version>\` containing `.codex-plugin\plugin.json`, `.mcp.json`, `agents\`, `commands\`, `skills\`, `README.md`

| Category | Plugins |
|---|---|
| Productivity | linear, google-calendar, gmail, slack, teams, sharepoint, outlook-email, outlook-calendar, jam, stripe, notion |
| Design | canva, figma |
| Dev | github, vercel, netlify, cloudflare, sentry, hugging-face, game-studio, build-ios-apps, build-web-apps, test-android-apps |
| Storage | box, google-drive |

### Superpowers Library
`C:\Users\jwchu\.codex\superpowers\`
- Version: 4.0.3 (by Jesse Vincent)
- Contains: `agents\`, `commands\`, `hooks\`, `lib\`, `skills\`, `docs\`, `elements-of-style\`
- Marketplace definition: `C:\Users\jwchu\.codex\superpowers\.claude-plugin\marketplace.json`
- Hooks config: `C:\Users\jwchu\.codex\superpowers\hooks\hooks.json`
- Session start script: `C:\Users\jwchu\.codex\superpowers\hooks\session-start.sh`

### MCP Servers (7)
`C:\Users\jwchu\.codex\config.toml` → `[mcp_servers]` section

playwright, sequential-thinking, context7, context-mode, ark-ui, supabase, vercel

### Config
- `C:\Users\jwchu\.codex\config.toml` — model: gpt-5.4, reasoning: xhigh, 10 enabled plugins, trust levels per project
- `C:\Users\jwchu\.codex\auth.json` — ChatGPT Plus (active through 2026-04-20)
- `C:\Users\jwchu\.codex\rules\default.rules` — 43 pre-approved command patterns
- `C:\Users\jwchu\.codex\.codex-global-state.json` — UI state, prompt history, workspace roots, theme
- `C:\Users\jwchu\.codex\version.json` — v0.118.0
- `C:\Users\jwchu\.codex\models_cache.json` — 652 lines, model definitions (gpt-5.4, gpt-5.3-codex, etc.)
- `C:\Users\jwchu\.codex\AGENTS.md` — discovered agent/workflow documentation

### Automation
`C:\Users\jwchu\.codex\automations\update-agents-md\automation.toml` — weekly (Fridays 11:00 AM), auto-updates AGENTS.md, model: gpt-5.4, status: ACTIVE

### Context/State
- `C:\Users\jwchu\.codex\state_5.sqlite` — 669 MB primary state store
- `C:\Users\jwchu\.codex\logs_1.sqlite` — 482 MB activity database (+WAL files)
- `C:\Users\jwchu\.codex\session_index.jsonl` — session metadata
- `C:\Users\jwchu\.codex\history.jsonl` — command history
- `C:\Users\jwchu\.codex\archived_sessions\` — previous session backups
- `C:\Users\jwchu\.codex\memories\` — knowledge graph storage (empty)
- `C:\Users\jwchu\.codex\.sandbox\requests\` — 66+ cached sandbox responses
- `C:\Users\jwchu\.codex\.sandbox\setup_marker.json` — sandbox init state
- `C:\Users\jwchu\.codex\.sandbox-bin\` — codex.exe, codex-command-runner.exe
- `C:\Users\jwchu\.codex\.sandbox-secrets\sandbox_users.json` — sandbox credentials
- `C:\Users\jwchu\.codex\worktrees\` — git worktree management
- `C:\Users\jwchu\.codex\log\` — application logs
- `C:\Users\jwchu\.codex\sandbox.log` — sandbox runtime log

---

## .copilot (GitHub Copilot)

Minimal. Only contains IDE lock files.
- `C:\Users\jwchu\.copilot\ide\` — lock files with MCP socket paths and workspace references to `e:\writing-system`

No skills, no config, no context files.

---

## Cross-tool Comparison

| Feature | .cursor | .gemini | .picoclaw | .claude | .codex | .copilot |
|---|---|---|---|---|---|---|
| Skills | 7 | 0 | 6 | 37 | 43 | 0 |
| MCP servers | 4 (cached) | 2 | 0 | 12 | 7 | 0 |
| Plugin marketplace | 3 cached | none | ClawhHub | 269 indexed | 25 curated | none |
| Context/state | ai-tracking db | brain/ + protobuf | heartbeat + memory | projects + plans + sessions | sqlite (1.1 GB) | lock files only |
| Config complexity | light | light | heavy (27 providers) | heavy | heavy | none |
