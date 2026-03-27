# Legal-10 Documentation Index

## Concern-Based Folders

Each folder contains a `_INDEX.md` with reading order, source code mapping, and cross-references.

| Folder | Concern | Key Question It Answers |
|--------|---------|------------------------|
| [fdq/](fdq/_INDEX.md) | Formal Delivery Queries | What does each evaluation step ask, expect, and score? |
| [platform/](platform/_INDEX.md) | Runtime Engine | How does the runner execute chains (staging, state, messages, audit)? |
| [build-pipeline/](build-pipeline/_INDEX.md) | Build-Time Pipeline | How are RPs, EUs, and benchmarks constructed from raw data? |
| [mvp/](mvp/_INDEX.md) | 3-Step MVP | What are the M1 deliverables and the 3-step-specific specs? |
| [10-step-chain/](10-step-chain/_INDEX.md) | Full 10-Step Chain | How does the complete evaluation chain extend the MVP? |

## Working Context Scoping

To work on a specific concern, an AI agent only needs:

- **"Fix d1 scoring"** → read `fdq/01-ka-sc.md` + `mvp/d1-known-authority-scorer.py.md`
- **"Fix state sanitization"** → read `platform/inter-step-requirements.md` (IS-1.x) + `platform/statefulness-context-persistence.md`
- **"Fix message assembly"** → read `platform/prompt-messages.md` + `platform/inter-step-requirements.md` (IS-4.x)
- **"Fix EU builder"** → read `build-pipeline/eu-builder-reference.py.md` + `build-pipeline/eu-builder-notes.md`
- **"Fix judge scoring"** → read `fdq/post/irac-pair-scoring.md`
- **"Add bundle sealing"** → read `mvp/M1-buildtime-packaging-sealing-dev-brief.md` (sealing section)

## Existing Subfolders (unchanged)

| Folder | Contents |
|--------|----------|
| `-ongoing-work/` | Active work logs and issue tracking |
| `-prompts/` | Prompt engineering notes |
| `secondary-reference/` | Historical versions, superseded specs, early drafts |
| `specifications/` | Additional specifications |
| `steps-reference/` | Per-step implementation guides and notes |

## Authority Hierarchy

When documents conflict:
1. `mvp/M1-buildtime-packaging-sealing-dev-brief.md` — highest authority for bundle layout/schemas
2. `platform/inter-step-requirements.md` — highest authority for runtime behavior
3. `fdq/*.md` — authoritative for their specific step's prompt/contract/scoring
4. Everything else — supplementary
