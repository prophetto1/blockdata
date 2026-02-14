# Single Implementation Plan — Full Quality Prompt

Use this prompt to produce ONE implementation plan from ONE source file (or a small group of related source files). This prompt is designed to use the full context window on one plan rather than rushing through many.

---

## Inputs

- **Source file(s):** (paste path or content)
- **Guideline:** `E:\writing-system\dev-todos\implementation-plans\implementation plan drafting guideline.md`
- **Tracker:** `E:\writing-system\dev-todos\implementation-plans\0214-source-file-tracker.md`
- **Repo access:** Use file search, grep, database queries, and edge function listings to verify current state.

---

## Instructions — Execute All 5 Passes In Order

You must complete all five passes before producing the final plan. Do not skip passes. Do not combine passes. Show your work for each pass.

### Pass 1: Extraction

Read the source file completely. Produce a numbered list of every actionable item in the document. For each item, record:

- **Item #**
- **Source line or section** (where in the document this comes from)
- **Verbatim text** (copy the item as written — do not rephrase)
- **Type** (action / decision / policy / constraint / test)

Rules:
- If the document has 40 actionable items, list all 40. Do not summarize or group.
- If an item is vague in the source, flag it as vague — do not guess what it means.
- If content is not actionable (historical notes, status legends, governance boilerplate), list it separately as "non-actionable" and explain why.

### Pass 2: Repo State Check

For each item from Pass 1, check the actual current state of the repository:

- Does the output already exist? (Search for files, tables, migrations, edge functions, UI components.)
- If yes: record what exists, where, and its current state.
- If no: record that it does not exist.
- If partially: record what's present and what's missing.

Present this as a table:

| Item # | Expected Output | Exists? | Location / Evidence | Notes |
|---|---|---|---|---|

Rules:
- Actually search the repo. Do not guess from memory.
- Check database tables, migrations, edge functions, frontend files, test files.
- If MCP tools are available, use them for database/function queries.

### Pass 3: Draft

Using the extraction (Pass 1) and repo state (Pass 2), draft the implementation plan following the guideline exactly.

Structure:
1. **Header** — filename (UID), problem, solution, scope.
2. **Included Implementation Rules** — embed any resolved decisions or policies the actions depend on. Do not reference external documents.
3. **Actions** — 3-column table. Full explanatory sentences. Every action ends with a tangible output. Note which outputs already exist in the repo.
4. **Completion Logic** — explicit lock conditions, each a binary true/false check.

Rules:
- Group items from Pass 1 into actions by the grouping rules in the guideline.
- If multiple Pass 1 items map to one action, the action description must cover all of them.
- If a Pass 1 item cannot be converted into an action (it's a decision or policy), embed it as an Included Implementation Rule.
- If a Pass 1 item is vague and you cannot determine what the action should be, flag it explicitly in the plan rather than guessing.

### Pass 4: Completeness Audit

Compare the draft (Pass 3) against the extraction (Pass 1) line by line.

For each Pass 1 item, answer:
- Is it covered by an action in the draft? (Which action #?)
- Is it covered by an Included Implementation Rule?
- Is it listed as non-actionable?
- Is it missing from the draft entirely?

Present this as a checklist:

| Item # | Verbatim (abbreviated) | Covered By | Status |
|---|---|---|---|
| 1 | "Add superuser-manageable..." | Action 1 | covered |
| 2 | "Credential precedence must..." | Rule 4 | covered |
| 3 | "Historical baseline note..." | non-actionable | orphan |
| 4 | "Unclear: TBD scope for..." | — | flagged as vague |

Rules:
- If ANY item is missing, go back to Pass 3 and fix the draft before continuing.
- If ANY item was invented (appears in the draft but not in Pass 1), remove it.
- The draft must account for 100% of Pass 1 items. Zero untracked items.

### Pass 5: Guideline Compliance Check

Walk through every section of the guideline and confirm the draft complies:

- [ ] File name follows `YYYY-MMDD-HHMM-verb-nouns-scope.md` pattern
- [ ] Header has all four fields (filename, problem, solution, scope)
- [ ] Included Implementation Rules are embedded (not referenced externally)
- [ ] Actions are in a 3-column table (Action #, Description, Output)
- [ ] Every action description is full sentences, not fragments
- [ ] Every action ends with a tangible, visible, verifiable output
- [ ] Actions are sequential/parallel with each triggering downstream work
- [ ] Last action produces the final output artifact
- [ ] Completion Logic has explicit lock conditions
- [ ] No sign-off or governance process actions
- [ ] No invented process documents as outputs
- [ ] Plan covers a complete vertical slice of its scope

If any check fails, fix the draft before producing the final output.

---

## Final Output

After all 5 passes are complete and clean:

1. Write the implementation plan file to `E:\writing-system\dev-todos\implementation-plans/`
2. Update `0214-source-file-tracker.md` with status, resulting plans, and orphans.
3. State how many Pass 1 items were extracted, how many are covered, how many are orphans, and how many were flagged as vague.

---

## Quality Contract

The plan is only acceptable if:

- 100% of actionable items from the source are accounted for (covered by an action or rule, or explicitly classified as non-actionable with reasoning).
- 0% of actions in the plan are invented (every action traces to a source item).
- 0 guideline compliance failures.
- Repo state is checked, not assumed.
