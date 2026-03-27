---
title: Message Assembly
description: Fenced window protocol and prompt construction.
sidebar:
  order: 2
---

## Fenced window protocol

Each prompt window is a separate `{"role":"user","content": ...}` message, fenced with delimiters:

```
<<<BEGIN_{NAME}>>>
...content...
<<<END_{NAME}>>>
```

## Window ordering (fixed)

1. **ENV** — environment context
2. **ANCHOR_PACK** — anchor case payload (always present)
3. **EVIDENCE_PACK** — research pack authorities (only when p2 admitted)
4. **CARRY_FORWARD** — prior step outputs (only if non-empty)
5. **TASK** — step-specific instructions
6. **OUTPUT_GUARD** — output format constraints (never truncated)

## Payload admission

Controlled by `plan.json` `inject_payloads` per step. Admission is cumulative — once admitted, a payload remains visible for all subsequent steps.
