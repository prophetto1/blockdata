# Hookify for Codex

This is a Codex-compatible adaptation of the Claude `hookify` plugin.

## What it preserves

- The markdown rule format from Claude hookify
- `warn` and `block` actions
- `bash`, `file`, `stop`, `prompt`, and `all` event types
- Regex and multi-condition matching

## What changes in Codex

Codex does not expose a native hook pipeline like Claude Code, so this adaptation cannot auto-intercept every tool call inside Codex itself.

Instead, this package gives you:

- A CLI that evaluates the same rules on demand
- A Codex skill for writing rules in the same format
- A compatibility path for Git hooks, wrapper scripts, CI checks, or manual preflight checks

## Rule locations

The runner searches these directories in order:

1. `.codex/hookify.*.local.md`
2. `.claude/hookify.*.local.md`

If the same rule `name` exists in both locations, the `.codex` version wins.

That means you can:

- keep one shared rule set in `.claude/`
- add Codex-specific overrides in `.codex/`

## CLI usage

From the repo root:

```powershell
python tools/codex/hookify/scripts/hookify_codex.py list-rules
python tools/codex/hookify/scripts/hookify_codex.py check-command --command "rm -rf /tmp/test"
python tools/codex/hookify/scripts/hookify_codex.py check-file --file-path "src/example.ts" --new-text "console.log('debug')"
python tools/codex/hookify/scripts/hookify_codex.py check-stop --transcript "npm run test"
python tools/codex/hookify/scripts/hookify_codex.py check-prompt --prompt "deploy to production"
```

Exit codes:

- `0`: allow or warn
- `2`: blocked by at least one matching rule
- `1`: runner error

Use `--json` on any `check-*` command to emit the raw rule-engine response.

## Suggested Codex workflows

### Manual preflight before risky shell commands

```powershell
python tools/codex/hookify/scripts/hookify_codex.py check-command --command "git push origin master"
```

### Manual preflight before editing generated or sensitive files

```powershell
python tools/codex/hookify/scripts/hookify_codex.py check-file --file-path ".env" --new-text "API_KEY='...'"
```

### Git hook or wrapper integration

Because the runner returns a blocking exit code, it can be called from:

- repo-local Git hooks
- PowerShell wrappers
- CI jobs
- custom launch scripts around Codex workflows

## Compatibility note

This package preserves the hookify rule format, not Claude's native hook transport. The rule engine is portable; the automatic event bridge is not.
