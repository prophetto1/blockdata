---
title: content
description: Global writing and formatting contract for all documentation pages.
---

Rules that govern how every page on this site is written. All contributors — human and AI — must follow these conventions.

## Page Types

Every page falls into one of these categories. The category determines which formatting rules apply.

| Type | Purpose | Examples |
|------|---------|---------|
| Inventory | Complete feature/API/tool reference | Keystatic, Starlight Components |
| Contract | Current config values and design tokens | Layout, Fonts, Colors, Typography, this page |
| Guide | Step-by-step procedures | Getting Started |
| Analysis | Research, evaluation, or assessment | Kestra handlers, AI integrations |
| Reference | Quick-lookup operational info | Local URLs |

## Tables

### When to use tables

- Inventorying options, fields, props, tokens, or config values
- Comparing items that share the same attributes
- Quick-lookup reference data (URLs, ports, env vars)

### When not to use tables

- Explaining a single concept (use prose)
- Sequential instructions (use Steps or ordered lists)
- Fewer than 3 rows of data (use a definition list or inline description)

### Table structure rules

- Every table must have a header row
- Column names must be short nouns: Field, Type, Description, Default, Value, Usage — not sentences
- "Description" columns explain *what it does and when to use it* — not just a label restatement
- Do not add a "Default" column if most cells would be empty or "—"
- Do not add a "Type" column if the type is obvious from context (e.g. all strings)
- Tables that would have only 2 columns where the second column is just "Yes" or a trivial value should be plain lists instead

### Inventory page tables

Inventory pages (like Keystatic, Starlight Components) must include:

- Every available option, field, prop, or method — not a curated subset
- Grouped by category with an H3 per group
- Consistent column structure within each group
- Typical columns: Field/Option, Type, Description, Key Options (for nested config)

## Prose

### When to use prose

- Explaining intent, trade-offs, or architectural decisions
- Describing when and why to use a feature (usage guidance)
- Introductory context at the top of a section before a table
- Caveats, warnings, and edge cases

### Prose rules

- Lead each component/section with 1–2 sentences of usage guidance *before* the inventory table
- Do not repeat in prose what the table already says
- Do not write "The following table shows..." — just put the table there
- Keep paragraphs to 3 sentences max

## Code Examples

- Include live rendered examples for visual components (Aside, Badge, Card, etc.)
- Include raw syntax examples for Markdown features (fenced blocks, asides, etc.)
- Always set the language on fenced code blocks
- Use `title` only when the code represents a specific file
- Do not show both the raw syntax and the rendered output for every variant — show one representative example rendered, then cover the rest in the inventory table

## Headings

- H2 (`##`) for top-level sections within a page
- H3 (`###`) for subsections and table group headings
- H4 (`####`) only when H3 subsections need further breakdown
- Never skip heading levels
- Heading text should be a short noun phrase, not a sentence

## Page Structure

Every page must follow this order:

1. **Frontmatter** — title and description (required)
2. **Imports** — MDX component imports if needed
3. **Lead paragraph** — 1–2 sentences explaining what this page covers
4. **Sections** — H2 sections, each with optional guidance prose followed by inventory tables
5. **Sources** — external reference links at the bottom (if applicable)

## Frontmatter

| Field | Required | Rule |
|-------|----------|------|
| title | Yes | Short noun phrase, no trailing period |
| description | Yes | One sentence, explains what the page documents |

Do not add fields beyond title and description unless the content collection schema requires them (e.g. proposals have status, author, etc.).

## What Not to Write

- Do not add comments like `<!-- removed -->` or `// TODO` in published docs
- Do not write placeholder sections with empty headings (fill them or remove them)
- Do not duplicate content that lives on another page — link to it
- Do not add emoji unless the page is specifically about emoji support
- Do not write "Note:" in body text — use an `:::note` aside
