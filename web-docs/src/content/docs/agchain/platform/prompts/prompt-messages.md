---
title: "Prompt message assembly"
sidebar:
  order: 1
---

┌─────────────────────────────────────────────────────────────┐
│ <<<BEGIN_ENV>>>                                             │
│   [System-level framing / role setup]                       │
│ <<<END_ENV>>>                                               │
├─────────────────────────────────────────────────────────────┤
│ <<<BEGIN_ANCHOR_PACK>>>                                     │
│   [p1 content - anchor opinion text]                        │
│ <<<END_ANCHOR_PACK>>>                                       │
├─────────────────────────────────────────────────────────────┤
│ <<<BEGIN_EVIDENCE_PACK>>>                                   │
│   [p2 content - Research Pack, only after j10 admission]    │
│ <<<END_EVIDENCE_PACK>>>                                     │
├─────────────────────────────────────────────────────────────┤
│ <<<BEGIN_CARRY_FORWARD>>>                                   │
│   [candidate_state from prior steps]                        │
│ <<<END_CARRY_FORWARD>>>                                     │
├─────────────────────────────────────────────────────────────┤
│ <<<BEGIN_TASK>>>                                            │
│   [The actual FDQ question for this step]                   │
│ <<<END_TASK>>>                                              │
├─────────────────────────────────────────────────────────────┤
│ <<<BEGIN_OUTPUT_GUARD>>>                                    │
│   [Response format requirements]                            │
│ <<<END_OUTPUT_GUARD>>>                                      │
└─────────────────────────────────────────────────────────────┘


If there's content that's identical across ALL steps for an EU, that would be ENV — the benchmark-level framing that doesn't change step-to-step.

Something like:

You are being evaluated as a legal research assistant.
You will receive materials and answer questions about them.
Base your answers only on the materials provided.
This is fixed per EU (same for d1, d2, d3... j10).

Whereas TASK changes every step (KA-SC question, then C-NONEXIST1 question, then CANARY question...).

Could also be something like:

┌─ SYSTEM (role: "system") ─────────────────────┐
│ "You are being evaluated as a legal research  │
│ assistant analyzing Supreme Court opinions..." │
│ [FIXED - same across all 10 steps]            │
└───────────────────────────────────────────────┘

┌─ USER (role: "user") ─────────────────────────┐
│ <<<BEGIN_ENV>>>                               │
│ ...step context? run metadata?...             │
│ <<<END_ENV>>>                                 │
│                                               │
│ <<<BEGIN_ANCHOR_PACK>>>                       │
│ ...p1 content...                              │
│ <<<END_ANCHOR_PACK>>>                         │
│                                               │
│ <<<BEGIN_TASK>>>                              │
│ ...the actual FDQ question for this step...   │
│ <<<END_TASK>>>                                │
└───────────────────────────────────────────────┘

Separates the API message roles from the fenced windows:

SYSTEM message (role: system)

Fixed for entire EU run
Benchmark-level role framing
Same for d1 through j10
USER message (role: user)

Contains fenced windows
ENV = step-specific context (run metadata, step number, etc.)
ANCHOR_PACK = p1 content (once admitted)
EVIDENCE_PACK = p2 content (once admitted at j10)
CARRY_FORWARD = candidate_state
TASK = the actual FDQ question
OUTPUT_GUARD = response format

So FDQ documents should specify:

- Fixed System Prompt	: role: system message (shared across all FDQs, defined once at benchmark level)
- Step Context	: <<<BEGIN_ENV>>> window (if step needs specific context)
- Prompt Template : <<<BEGIN_TASK>>> window
- Response Format : <<<BEGIN_OUTPUT_GUARD>>> window

---
So for a step like d2 (C-NONEXIST1) after p1 is admitted but before p2:


Message Structure
messages[0] = {role: "system", content: "[invariant - global eval framing]"}
messages[1] = {role: "user", content: "<<<BEGIN_ENV>>>...<<<END_ENV>>>"}
messages[2] = {role: "user", content: "<<<BEGIN_ANCHOR_PACK>>>[p1 content]<<<END_ANCHOR_PACK>>>"}
messages[3] = {role: "user", content: "<<<BEGIN_EVIDENCE_PACK>>><<<END_EVIDENCE_PACK>>>"}  // empty until j10
messages[4] = {role: "user", content: "<<<BEGIN_CARRY_FORWARD>>>[d1 outputs]<<<END_CARRY_FORWARD>>>"}
messages[5] = {role: "user", content: "<<<BEGIN_TASK>>>[C-NONEXIST1 questions]<<<END_TASK>>>"}
messages[6] = {role: "user", content: "<<<BEGIN_OUTPUT_GUARD>>>[response format]<<<END_OUTPUT_GUARD>>>"}



