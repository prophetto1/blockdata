# Guardrail & Hook Options for AI Coding Agents

**Date:** 2026-04-07
**Purpose:** Consolidated list of all guardrail, hook, and enforcement options evaluated for preventing lazy output, forcing verification, blocking dangerous operations, and enforcing code quality gates.

---

## Claude Code-Specific

### 1. Hookify (Anthropic Official Plugin)
- **URL:** https://github.com/anthropics/claude-code/tree/main/plugins/hookify
- **Type:** Claude Code plugin (official)
- **Install:** Part of Claude Code marketplace, auto-discovered
- **What it does:** Create hooks from natural language (`/hookify Don't say "days ago" without checking`). Rules stored as `.claude/hookify.*.local.md` markdown files. Supports `block` and `warn` actions. Regex pattern matching across bash, file, stop, and prompt events. `/hookify` with no args analyzes current conversation for repeated failure patterns.
- **Strengths:** Zero-config, natural language rule creation, conversation analysis, immediate effect without restart
- **Weaknesses:** Claude Code only

### 2. dwarvesf/claude-guardrails
- **URL:** https://github.com/dwarvesf/claude-guardrails
- **Type:** Claude Code hook suite (community)
- **Install:** `npx claude-guardrails install full` (requires `jq`)
- **What it does:** Two variants — Lite (3 PreToolUse hooks) and Full (5 hooks + PostToolUse injection scanner). Blocks destructive deletes, direct pushes, pipe-to-shell, data exfiltration, permission escalation. Merges into existing settings.json with automatic backup.
- **Strengths:** Drop-in, well-documented, uninstall support, five-layer defense model
- **Weaknesses:** Security-focused only — does not address behavioral problems (lazy output, careless claims)

### 3. trailofbits/claude-code-config
- **URL:** https://github.com/trailofbits/claude-code-config
- **Type:** Claude Code config suite (security firm)
- **Install:** `git clone` then `/trailofbits:config`
- **What it does:** Opinionated defaults from Trail of Bits. Hooks for rm-rf blocking, direct-push protection. Anti-rationalization prompt hooks that force completion before stopping. Audit logging hooks. Credential protection deny rules.
- **Strengths:** Anti-rationalization gate directly applicable to the "claiming done without verification" pattern. Trusted source (security auditing firm).
- **Weaknesses:** Claude Code only

### 4. wangbooth/Claude-Code-Guardrails
- **URL:** https://github.com/wangbooth/Claude-Code-Guardrails
- **Type:** Claude Code hook suite (community)
- **Install:** Git clone + config
- **What it does:** Protective hooks for preventing accidental code loss — branch protection, automatic checkpointing, safe commit squashing.
- **Strengths:** Directly addresses "lost commits" scenario
- **Weaknesses:** Narrow scope — only code loss prevention

### 5. mafiaguy/claude-security-guardrails
- **URL:** https://github.com/mafiaguy/claude-security-guardrails
- **Type:** Claude Code security layer + dashboard
- **Install:** Node.js setup + React dashboard
- **What it does:** Scans for secrets, SQL injection, eval(), 30+ risky patterns. React dashboard for monitoring blocked events.
- **Strengths:** Comprehensive security scanning
- **Weaknesses:** Heavier than needed for behavioral enforcement. Dashboard is overkill for solo use.

---

## Model-Agnostic (Works Across Claude Code, Cursor, Copilot, Codex, etc.)

### 6. atlas-guardrails
- **URL:** https://github.com/marcusgoll/atlas-guardrails
- **Type:** Repo-level guardrail system (model-agnostic)
- **Install:** Plugin or CI integration
- **What it does:** Indexes repo, forces agents to read context before writing code. Three core rules: pack context before editing, search for duplicates before creating files, detect API drift. Runs `atlas check` locally or in CI.
- **Strengths:** Directly attacks pattern drift and duplicate creation. Would have caught duplicated `inputClass` across settings files. Works with any coding agent.
- **Weaknesses:** Repo-level only — does not address session-level behavioral problems

### 7. guardrails-ai/guardrails
- **URL:** https://github.com/guardrails-ai/guardrails
- **Type:** Python validation framework (model-agnostic)
- **Install:** `pip install guardrails-ai`
- **What it does:** Input/output validation framework for any LLM. Validators detect specific risk types. Guardrails Hub has pre-built validators. Custom validators for code quality, token compliance, etc.
- **Strengths:** Fully model-agnostic, extensible, could build validators for hardcoded hex values or token compliance
- **Weaknesses:** Framework, not drop-in — requires building custom validators

### 8. NVIDIA NeMo Guardrails
- **URL:** https://github.com/NVIDIA-NeMo/Guardrails
- **Type:** Programmable guardrails toolkit (model-agnostic)
- **Install:** Python package
- **What it does:** Programmable guardrails using Colang (Python-like DSL). Topical, safety, and security rails. Intercepts inputs/outputs, blocks or modifies based on policies.
- **Strengths:** Powerful, well-maintained (NVIDIA), Colang DSL is expressive
- **Weaknesses:** Designed for conversational AI applications, not coding agents specifically. Overkill for this use case.

### 9. VoltAgent/awesome-agent-skills
- **URL:** https://github.com/VoltAgent/awesome-agent-skills
- **Type:** Cross-agent skill repository + quality gates
- **Install:** Skill import
- **What it does:** 1000+ community skills with cross-agent quality gates. Skills work across Claude Code, Codex, Cursor, Gemini CLI, Copilot, Windsurf, 30+ tools. Quality gate system validates SKILL.md files across tools.
- **Strengths:** Cross-tool compatibility standard for skills
- **Weaknesses:** Not guardrails per se — the quality gate system is the enforcement mechanism, not behavioral control

### 10. CodeScene AI Code Guardrails (Commercial)
- **URL:** https://codescene.com/use-cases/ai-code-quality
- **Type:** Commercial CI-integrated quality gates
- **Install:** SaaS / CI integration
- **What it does:** Quality gates for AI-generated code. Validates and quality-gates GenAI code in CI pipeline.
- **Strengths:** Solves the exact problem at the CI level
- **Weaknesses:** Not open source. Paid product.

---

## Recommended Combination

| Layer | Tool | Scope |
|---|---|---|
| Session-level behavioral enforcement | **Hookify** | Block/warn on specific patterns during Claude Code sessions |
| Session-level security | **dwarvesf/claude-guardrails** | Block dangerous shell commands, credential access |
| Session-level anti-rationalization | **trailofbits/claude-code-config** | Force completion verification before stopping |
| Repo-level drift prevention | **atlas-guardrails** | Context packing, duplicate detection, API drift checks |
| CI-level quality gate | Custom or CodeScene | Catch what session hooks miss |

---

## Key Insight from Research

CLAUDE.md rules are advisory (~80% compliance). Hooks are deterministic (100%). The community consensus: put mechanical rules (verify, don't guess, check dates) into hooks, not CLAUDE.md. Behavioral guidance degrades past ~150-200 rules. Each low-value rule dilutes compliance of all others equally.

Sources:
- https://paddo.dev/blog/claude-code-hooks-guardrails/
- https://www.shareuhack.com/en/posts/claude-code-claude-md-setup-guide-2026
- https://github.com/hesreallyhim/awesome-claude-code
- https://github.com/rohitg00/awesome-claude-code-toolkit