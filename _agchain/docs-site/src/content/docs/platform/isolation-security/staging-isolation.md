---
title: Staging & Isolation
description: Per-call staging directories and the structural no-leak invariant.
sidebar:
  order: 1
---

Before each evaluated model call, the runner creates an isolated staging directory containing only the files the model is allowed to see.

## Staging protocol

1. Create `staging/{run_id}/{call_id}/`
2. Copy the current step definition
3. Copy only admitted payload files
4. Copy sanitized `candidate_state.json`
5. Hash all staged files for audit
6. Assemble messages from staged content
7. Call evaluated model
8. Delete staging directory after completion

## No-leak invariant

The evaluated model must never see:

- `ground_truth.json`
- Judge prompts
- Future step definitions
- Unadmitted payloads
