# Implementation Plan Drafting Guideline

## Purpose

Turn a source document into one or more implementation plans where everything actionable is converted into implementation actions.

## Core Definition

An implementation plan is a self-contained document that can live outside its source. It has a UID. It contains one or more actions grouped by logical or relational association. It must cover a complete vertical slice of its scope — if the scope is "build superuser connectors," the plan covers everything from database migration through smoke test, not just one layer.

## Grouping Rules

Group actions into one implementation plan when any of the following is true:

- The work has multiple sequential actions to complete.
- One action triggers or depends on another action.
- The actions meaningfully associate with each other.

## File Naming

The file name is the document UID: `date + time + verb-nouns-scope`

Example: `2026-0214-0534-develop-superuser-configs.md`

## Internal Structure

Every implementation plan has four sections in this order.

### Section 1: Header

- `filename`: the document UID.
- `problem`: the current problem that created the need (if applicable).
- `solution`: the agreed solution in normal phrasing, including objective or purpose.
- `scope`: what development this plan covers.

### Section 2: Included Implementation Rules (when applicable)

If the plan depends on resolved decisions, policies, or constraints, those must be embedded directly in the plan as numbered rules. Do not reference external documents ("see Section X of document Y"). Any rule that an action enforces or validates must be readable inside this plan.

### Section 3: Actions

Actions are presented in a three-column table:

| Column | Content |
|---|---|
| Action # | Sequential number |
| Detailed Action Description | Full explanatory sentences, not fragments. Can be a paragraph or longer. |
| Output | The tangible, visible, verifiable artifact this action produces. |

Action rules:

- Actions run from a clear starting point to a meaningful end point.
- Actions can be sequential or parallel, but each action must trigger or feed into a related downstream action.
- Every action ends when it produces an output — a file (e.g., `index.ts`), a database row, a test result, or a deployed function.
- The last action in the plan produces the final output artifact (e.g., a smoke test pass confirmation).

### Section 4: Completion Logic

Completion logic defines when the plan is truly done using explicit lock conditions. Each lock is a verifiable binary condition (true or false).

Example:
- Schema lock: the two connector tables exist with enforced constraints and baseline rows.
- API lock: superuser-only endpoints are deployed and return sanitized payloads.
- Verification lock: automated tests pass and smoke evidence is published.

The plan is complete only when all lock conditions are true.

## What Is Not an Action

- **Decision sign-off processes.** If a source document has open decisions, resolve them first and embed the results as Included Implementation Rules. Do not create a separate "sign-off plan."
- **Process or governance documents.** "Publish an operating cadence note" or "produce a decision versioning policy" are not implementation outputs. If the source document does not explicitly require the artifact, do not invent it.
- **Any output that does not exist in the codebase, database, or test results.** Every action must produce something tangible — not a policy document about how to manage other documents.

## Drafting Prompt (Use as-is)

Rewrite the source document into one or more implementation plans using this exact guideline.

Requirements:
- Convert all actionable content into implementation actions.
- Group actions into plans using the grouping rules.
- Use the file naming structure for each plan UID.
- Use the four internal sections: Header, Included Implementation Rules (when applicable), Actions (3-column table), Completion Logic (with lock conditions).
- Every action must end in a tangible, visible, verifiable output.
- Do not write fragment-style actions.
- Do not reference external documents for rules that actions depend on — embed them in the plan.
