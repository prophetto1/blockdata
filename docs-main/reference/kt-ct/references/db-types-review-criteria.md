# KT DB Types Review Criteria

Use this checklist to review `kt-ct/generated/database.types.kt.ts` before any promotion into product paths.

## Pass Criteria

- `kt` only. No `public` dependency leaks into the staged file.
- Schema coverage is complete. All expected `kt` tables and enums are represented.
- Type shapes are usable. `Row`, `Insert`, and `Update` types exist where needed.
- Nullability is accurate. Nullable columns are nullable in the types.
- JSON columns use the shared `Json` type.
- Naming is stable. Table names, enum names, and helper aliases are clear and consistent.
- Mapper readiness is good. The file is detailed enough for `kt.flows`, `kt.executions`, `kt.logs`, `kt.triggers`, and `kt.metrics` mapper work.
- Inferred content is explicit. Any synthesized or inferred part is called out clearly.
- CT compliance is preserved. The file stays staged in `kt-ct/generated/` until reviewed and approved.

## Fail Criteria

- `public` types appear in the staged file.
- Expected `kt` tables or enums are missing.
- Nullability is obviously wrong.
- JSON fields are typed inconsistently.
- Naming is confusing enough to create mapper drift.
- The file creates false certainty about inferred schema details.
- The file is treated as product-ready before CT review.

## Review Outcome

Pass:
- The staged file is accepted as the canonical DB type source for the next preparatory step.

Fail:
- Regenerate or rewrite the staged file before any worker relies on it.
