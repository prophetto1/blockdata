When answering product, architecture, implementation, or design questions:
- Treat `docs/plans/**` as the primary source of intent.
- Use current implementation second to verify what actually landed.
- Use external docs and internet search third to validate standards, products, and factual claims.
- Default to the larger implementation-driving question behind the user's wording, not the narrowest literal interpretation.
- Answer at the level most useful for implementation progress first; only narrow into product-support or low-level technical distinctions if they materially change the answer.
- If ambiguity remains, ask at most one short clarification question.
- Do not unilaterally downscope the user's intended product or implementation scope.
- Do not introduce "minimal", "MVP", "thin slice", "small", or similar scope-reducing frames unless the user explicitly asks for that constraint.
- Do not build or recommend placeholder implementations unless the user explicitly requests a placeholder, mock, scaffold, or temporary shell.
- If only part of a broad feature is implemented, state plainly that it is partial and name the missing exposed functionality.
- Preserve broad exposed functionality targets when the plans or user direction indicate near-parity or near-equivalent scope with a reference product.

Repos frequently checked during project
E:\signoz
B:\ark-ui
B:\open-parse
B:\react-pdf-highlighter
B:\remark
B:\unified
B:\kestra
B:\kestra-io
B:\mdast

## Context Mode

# context-mode - MANDATORY routing rules

You have context-mode MCP tools available. These rules are NOT optional - they protect your context window from flooding. A single unrouted command can dump 56 KB into context and waste the entire session. Codex CLI does NOT have hooks, so these instructions are your ONLY enforcement mechanism. Follow them strictly.

## BLOCKED commands - do NOT use these

### curl / wget - FORBIDDEN
Do NOT use `curl` or `wget` in any shell command. They dump raw HTTP responses directly into your context window.
Instead use:
- `ctx_fetch_and_index(url, source)` to fetch and index web pages
- `ctx_execute(language: "javascript", code: "const r = await fetch(...)")` to run HTTP calls in sandbox

### Inline HTTP - FORBIDDEN
Do NOT run inline HTTP calls via `node -e "fetch(..."`, `python -c "requests.get(..."`, or similar patterns. They bypass the sandbox and flood context.
Instead use:
- `ctx_execute(language, code)` to run HTTP calls in sandbox - only stdout enters context

### Direct web fetching - FORBIDDEN
Do NOT use any direct URL fetching tool. Raw HTML can exceed 100 KB.
Instead use:
- `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` to query the indexed content

## REDIRECTED tools - use sandbox equivalents

### Shell (>20 lines output)
Shell is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, and other short-output commands.
For everything else, use:
- `ctx_batch_execute(commands, queries)` - run multiple commands + search in ONE call
- `ctx_execute(language: "shell", code: "...")` - run in sandbox, only stdout enters context

### File reading (for analysis)
If you are reading a file to edit it -> reading is correct (edit needs content in context).
If you are reading to analyze, explore, or summarize -> use `ctx_execute_file(path, language, code)` instead. Only your printed summary enters context. The raw file stays in the sandbox.

### grep / search (large results)
Search results can flood context. Use `ctx_execute(language: "shell", code: "grep ...")` to run searches in sandbox. Only your printed summary enters context.

## Tool selection hierarchy

1. **GATHER**: `ctx_batch_execute(commands, queries)` - Primary tool. Runs all commands, auto-indexes output, returns search results. ONE call replaces 30+ individual calls.
2. **FOLLOW-UP**: `ctx_search(queries: ["q1", "q2", ...])` - Query indexed content. Pass ALL questions as array in ONE call.
3. **PROCESSING**: `ctx_execute(language, code)` | `ctx_execute_file(path, language, code)` - Sandbox execution. Only stdout enters context.
4. **WEB**: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` - Fetch, chunk, index, query. Raw HTML never enters context.
5. **INDEX**: `ctx_index(content, source)` - Store content in FTS5 knowledge base for later search.

## Output constraints

- Keep responses under 500 words.
- Write artifacts (code, configs, PRDs) to FILES - never return them as inline text. Return only: file path + 1-line description.
- When indexing content, use descriptive source labels so others can `search(source: "label")` later.

## ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `stats` MCP tool and display the full output verbatim |
| `ctx doctor` | Call the `doctor` MCP tool, run the returned shell command, display as checklist |
| `ctx upgrade` | Call the `upgrade` MCP tool, run the returned shell command, display as checklist |
