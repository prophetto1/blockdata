Task 6 should execute in two passes, with one generator per source of truth.

Recommended method

Generate DB types from the live Supabase project into CT.
Use the Supabase MCP type generator as the primary path, not the local CLI.
Reason: live kt is authoritative right now, supabase is not installed locally, and preparation artifacts must stay under kestra-ct/.

Generate Kestra contract types from openapi.yml into CT.
Use the already-installed @hey-api/openapi-ts from web-kt/package.json and run it from web-kt, but output into kestra-ct/generated/kestra-contract.
Reason: the repo already proves this toolchain works via openapi-ts.config.ts, and npx openapi-ts --help works locally.

Record the generation method in CT immediately after generation.
Task 6 explicitly says to update verification-matrix.md and decisions.md. That is part of the task, not follow-up cleanup.

Why this is the correct methodology

I checked the files that matter:

2026-03-09-kestra-integration-preparation-implementation-plan.md
2026-03-09-baseline-readiness.md
2026-03-09-supabase-schema-drift.md
web-kt/package.json
web-kt/openapi-ts.config.ts
web-kt/src/override/utils/route.ts
web-kt/src/stores/flow.ts
Those confirm:

web-kt already uses @hey-api/openapi-ts
the frontend contract is still Kestra-shaped
the live kt schema is ahead of the repo migration tree
CT-only staging is now a hard rule
So Task 6 should not:

write to supabase/functions/_shared/ yet
copy web-kt/src/generated/kestra-api as-is
generate axios client/sdk artifacts for the backend
The backend needs type references, not the full frontend client surface.

Exact execution sequence

Create kestra-ct/generated/kestra-contract/.
Generate DB types with the Supabase MCP generator and save to database.types.ts.
Verify that file includes the kt schema and the key tables: flows, executions, logs, triggers.
From web-kt, run a CT-output OpenAPI generation command using only the @hey-api/typescript plugin.
The shape should be:
cd web-kt
npx openapi-ts -i ../openapi.yml -o ../kestra-ct/generated/kestra-contract -p @hey-api/typescript
Verify the generated contract output exists and is types-only.
Create README.md in that folder documenting:
exact command used
source of truth
tool used
output files produced
later promotion target in runtime paths
Update verification-matrix.md with the exact Task 6 commands.
Update decisions.md with the promotion target and the “types-only for backend” rule.
Alternatives I would not use

npx supabase gen types ... as the primary DB path.
Reason: local supabase is missing, and Task 6 is preparation, not environment setup.
Reusing web-kt/src/generated/kestra-api.
Reason: that output is frontend-oriented and includes client/sdk concerns the backend does not need.
