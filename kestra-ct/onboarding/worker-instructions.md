# Kestra CT Worker Instructions

## Purpose

These instructions define the required worker flow for Kestra compatibility tasks. Workers follow the packet chain, preserve the Kestra contract, and do not improvise process or scope.

## Authority

This file is the general rulebook.

Environment-specific execution overlays may add stricter requirements.

For Windows execution, [windows-worker-execution-instructions.md](/home/jon/blockdata/kestra-ct/onboarding/windows-worker-execution-instructions.md) is the more specific document and wins on environment-specific details.

## Required Skill Order

1. `using-superpowers`
2. sequential thinking before capture or planning
3. `brainstorming` if the packet or contract is ambiguous
4. `writing-plans` before runtime implementation work
5. `executing-plans` when carrying out an approved packet or implementation plan
6. `verification-before-completion` before any success or completion claim

If a sequential-thinking tool is unavailable, the worker must still write a short pre-plan breakdown covering:

- route
- request path
- response shape
- target runtime files
- blockers
- verification path

## Required Artifact Chain

Every page task follows this order:

1. `packet`
2. `capture`
3. `implement`
4. `verify`

Do not skip a document in the chain.

## Scope Rules

- Follow the page packet exactly.
- Do not redesign the UI.
- Do not widen scope to another page without an updated packet.
- Keep `kt.*` Kestra-native. `namespace` is first-class.
- During preparation-only work, create artifacts in `kestra-ct/` only.
- During page implementation, edit only runtime files named in the packet or implementation doc.

## Verification Rules

- Record exact commands before running them.
- Verify current output, not remembered output.
- Do not claim a page works without fresh evidence.
- Put evidence in the `verify` doc, not in chat only.

## Stop Conditions

Stop and escalate if any of these occur:

- Missing route or endpoint contract detail
- Migration parity problem changes runtime assumptions
- Auth or config bootstrap blocks the target page
- The packet conflicts with the observed code
- The page depends on a second page or service not listed in scope

## No-Redesign Rule

Workers are building compatibility, not rethinking product UX. Preserve route shapes, payload shapes, page intent, and existing Kestra UI behavior unless a CT decision explicitly says otherwise.

## Writing Rules

- Put observed facts in `capture`.
- Put intended changes in `implement`.
- Put proven results in `verify`.
- Keep notes short and specific.
- Keep assumptions explicit.
