# instructions.md

## Source of truth
Your work must be true to:
`E:\writing-system\docling\output-a-docling-2.1-2.3-exhaustive-analysis-v2.md`

## Required deliverables
1. `2026-02-20-srl-matrix-v1.md`
2. `2026-02-20-docling-schema-ddl-v3.sql`
3. `2026-02-20-runtime-worklist-v1.md`
4. `2026-02-20-validation-report-v1.md`

## Execution order (phase-gated)
Follow this order exactly:

1. Phase 1: produce `2026-02-20-srl-matrix-v1.md`.
2. Stop and request approval before Phase 2.
3. Phase 2: produce `2026-02-20-docling-schema-ddl-v3.sql`.
4. Stop and request approval before Phase 3.
5. Phase 3: produce `2026-02-20-runtime-worklist-v1.md`.
6. Stop and request approval before Phase 4.
7. Phase 4: produce `2026-02-20-validation-report-v1.md`.

Do not skip phases.
Do not merge phases.
Do not declare completion early.

## Truth gate (mandatory)
You may output `TRUE` only when all are satisfied:

1. `2026-02-20-srl-matrix-v1.md` maps every spec requirement, with evidence and status (`meets/partial/missing`).
2. `2026-02-20-docling-schema-ddl-v3.sql` contains final table definitions, constraints, indexes, and triggers.
3. `2026-02-20-runtime-worklist-v1.md` lists exact code-path changes required to make schema usable.
4. `2026-02-20-validation-report-v1.md` includes totals and shows `missing = 0`.

If any item fails, output `FALSE`.
Never output `TRUE` with caveats.
