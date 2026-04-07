# Frontend Foundation Audit Report Template

Each run emits two files via the report generator script:

1. `foundation-audit.json`
2. `foundation-audit.md`

The markdown report follows this exact section order. Do not reorder, rename, or omit sections.

## Section Order

### 1. `# Frontend Foundation Audit Report`

Title line only.

### 2. `## Summary`

Table with aggregate counts:

| Metric | Value |
|---|---|
| Shell regions | count |
| Token sources | count |
| Component roles | count |
| Page patterns | count |
| Conflict bundles | count |
| Clean areas | count |
| Sampling mode | full or sampled |

### 3. `## Scope`

Bullet list:
- Repo name
- Audit date
- Captures reviewed (list or "none")
- Token files reviewed (list or "none")
- Major directories inspected
- Exclusions (list or "none")
- Surface area estimate (shell files, token files, shared components, page files)
- Sampling mode and notes

### 4. `## Shell Ownership Map`

Markdown table with columns: Region, Owner File(s), Runtime Role, State Owner, Clarity.

One row per shell region. Clarity column uses the rating directly: `clear`, `ambiguous`, or `conflicting`.

If the region has notes, append them as a bullet list below the table under `### Shell Notes`.

### 5. `## Navigation and Rail Structure`

Subsections:
- `### Primary Navigation` -- owner files and description
- `### Secondary Navigation` -- owner files and description, or "None identified"
- `### Route Mapping` -- how routes map to surfaces
- `### Breadcrumb Conventions` -- current approach or "None"
- `### Action Placement` -- where primary and contextual actions live

Evidence bullets at the end of each subsection.

### 6. `## Token and Theme Inventory`

Markdown table with columns: Source, File(s), Semantic, Raw Values, Light, Dark, Drift Notes.

Boolean fields render as "yes" or "no". Coverage fields render as "full", "partial", or "none".

### 7. `## Component Contract Inventory`

Markdown table with columns: Role, Canonical Candidate(s), Competing, Owner File(s), State Coverage.

Array fields render as comma-separated values. Empty competing implementations render as "--".

### 8. `## Page Pattern Inventory`

Markdown table with columns: Pattern, Strongest Example, Competing Examples, Structure Notes.

Empty competing examples render as "--".

### 9. `## State-Presentation Inventory`

One entry per state type:
- `### Loading`
- `### Empty`
- `### Error`
- `### Success`
- `### Permission`
- `### Async / Polling`

Each entry contains the current approach description. Render "No pattern identified." if null.

Evidence bullets at the end of the section.

### 10. `## Accessibility and Mode-Consistency Notes`

Bullet list. Render "No accessibility notes recorded." if empty.

### 11. `## Quick Wins`

Table listing only conflict bundles where `effortLevel` is `"quick-win"`, sorted by estimated files ascending.

| Bundle | Role | Est. Files | Recommended Direction |
|---|---|---|---|
| bundle name (linked to full bundle below) | role under dispute | count or "--" | one-line summary of recommendation |

Render "No quick wins identified." if no conflict bundles have `effortLevel: "quick-win"`.

This section exists so the reader can immediately see what can be resolved in a single focused session without reading every bundle.

### 12. `## Conflict Bundles`

One `### Bundle: <name>` subsection per conflict bundle. Each subsection contains:

1. **Role under dispute:** one-line description
2. **Effort level:** `quick-win`, `moderate`, or `architectural` (with estimated files if available)
3. **Competing implementations:** numbered list, each entry showing name, location, and what it solves
4. **Evidence:** bullet list, each prefixed with `[evidence]`
5. **Why no single contract exists:** paragraph
6. **Recommended direction:** bold paragraph
7. **Discussion questions:** numbered list

Render "No conflict bundles identified." if empty.

### 13. `## Clean Areas`

One `### <area>` subsection per clean area. Contains:
- Summary paragraph
- Evidence bullets prefixed with `[evidence]`

Render "No clean areas identified -- all audited areas have conflicts." if empty.

### 14. `## Recommended Directions`

Numbered list summarizing the strongest recommendation from each conflict bundle. Cross-reference bundle names by name.

Render "No recommendations -- no conflict bundles identified." if no conflict bundles exist.

### 15. `## Unresolved Decisions`

Numbered list aggregating all discussion questions from all conflict bundles.

Render "No unresolved decisions." if no discussion questions exist.

### 16. `## Suggested Next Artifact`

Single paragraph: "The next artifact should be the canonical frontend foundation contract, derived from this audit and the resolved discussion decisions."

## Formatting Rules

- Evidence always uses the `[evidence]` prefix: `- [evidence] src/layouts/AppShell.tsx:14-38`
- Conflict bundles must never be collapsed into a single summary line
- Clean areas must appear even when the list is empty
- Tables use pipe-delimited markdown
- Array values in table cells render as comma-separated
- Null or empty optional fields render as "--" in tables or "None" in prose
