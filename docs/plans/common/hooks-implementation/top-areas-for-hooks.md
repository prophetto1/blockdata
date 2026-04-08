Supabase migration history + linked-dev schema parity
This is the best first hook target. The docs treat migration reconciliation as the upstream blocker, and the schema-parity plan exists specifically because linked-dev drift is surfacing as late route failures instead of being caught at startup. A Husky gate should fire whenever supabase/migrations/**, startup scripts, or schema-parity files change, and it should block on migration immutability / parity preflight failures.
Superuser Operational Readiness contract
This area already has a strong contract: one backend-owned readiness snapshot, one page, grouped by Shared, BlockData, and AGChain, with explicit diagnostics instead of scattered probes. A Husky hook should protect changes to admin_runtime_readiness.py, runtime_readiness.py, SuperuserOperationalReadiness.tsx, useOperationalReadiness.ts, and related tests so this doesn’t drift back into fragmented status tooling.
BlockData browser-upload / GCS / bucket-CORS seams
This is the most concrete “real action” seam in the current correction program. The successor plan explicitly narrows Phase 1 to a real backend-owned action for blockdata.storage.bucket_cors, and the readiness plan already treats signed URL signing and bucket CORS as explicit BlockData prerequisites. Husky should protect ops/gcs/user-storage-cors.json, readiness action files, and upload-path code so browser upload regressions don’t sneak in.
Local platform-api bootstrap + dev recovery tooling
This is a pure dev-efficiency win. The recovery plan exists because local downtime is too expensive, and it locks a very specific seam: scripts/start-platform-api.ps1, a fixed PowerShell control script, Vite-local helper routes, and no arbitrary command runner behavior. Husky should gate those files hard, because one bad change there hurts every developer immediately.
Telemetry truthfulness / observability status
This is a high-value hook target because the repo already knows this seam lies easily: the backend route is still config-backed, not proof-backed, and the frontend telemetry pages are still called out as static placeholder copy. Husky should block changes to telemetry and observability files unless the focused backend/frontend tests for honest status behavior run too.
Pipeline Services operational proof
Pipeline Services is now a real surface, not a fake shell, but the current correction program says the remaining work is proof across storage, browser upload, and job execution, not more shell churn. Husky should protect pipelines.py, pipeline_storage.py, pipeline_jobs.py, and the pipeline UI panels so code touching upload, source-set, job, or deliverable seams can’t bypass focused verification.
Index Builder one-page workbench integrity
This is the most obvious “productivity” hook target on the frontend side. The plan calls out verified failures around dirty state, discard restore, save-before-run, and reload/deep-link state. A Husky hook should fire on IndexBuilderPage.tsx, useIndexBuilderJob.ts, usePipelineSourceSet.ts, and useIndexBuilderList.ts and run the direct regression suite before commit.
Shared selector contract across BlockData and AGChain
This is the classic cross-product blast-radius seam. The AGChain shell regression plan says the correct fix is a shared selector contract used by both BlockData and AGChain, with fixed width, shared dropdown behavior, and BlockData regression coverage because AGChain touches shared shell code. Husky should gate edits to ProjectSwitcher.tsx, ProjectFocusSelectorPopover.tsx, and TopCommandBar.css.
AGChain focus-sync + registry/create flow
Separate from the shared selector UI, AGChain still has its own high-risk focus and registry seam: cross-instance project focus synchronization, /app/agchain/projects?new=1, immediate selector refresh after create, and restored rail behavior. A Husky hook should protect useAgchainProjectFocus.ts, agchainProjectFocus.ts, AgchainProjectsPage.tsx, AgchainProjectSwitcher.tsx, and AgchainShellLayout.tsx.
AGChain provider credentials + org/project/admin model-surface split
This is the highest-risk AGChain domain seam right now because it changes credential ownership, page ownership, route ownership, and migrations all at once: project-scoped providers, organization-scoped providers, admin registry, and the removal of legacy user-scoped credential paths. Husky should gate edits to the AGChain model-provider routes, related migrations, and the three page families (/app/agchain/models, /app/agchain/settings/organization/ai-providers, /app/agchain-admin/models).

My blunt recommendation:

Implement Husky now for these 10 areas.
Make the hooks path-scoped and focused, not one repo-wide “run everything.”
Mirror the same checks in CI, because Husky is local and bypassable.
If you only have one implementation lane, I’d prioritize 1–7 first, then 8–10 in parallel or later, which matches the repo’s current blocker ordering and separate AGChain lane.


Yes. For a real full-scope Husky implementation plan, a planner who cannot access Supabase directly still can do the job, but only if you give them an authoritative backend contract packet.

The key point from investigating-and-writing-plan is this:

they do not need live DB access if you can give them enough evidence to justify every backend section as either:
concrete change, or
explicit zero-case
For this Husky/hooks project, the backend packet should include these 12 things.

Backend ownership map
They need a plain statement of what lives where:
services/platform-api owns FastAPI runtime behavior
supabase/migrations owns DB schema history
supabase/functions owns edge functions
Without that, they cannot lock the “actual seam” correctly.
Current platform API route inventory
Share the route list and which ones are critical to protect.
Source paths:
E:\writing-system\services\platform-api\app\api\routes
E:\writing-system\services\platform-api\app\main.py
Platform API verification contract
Exact command(s) the hooks may run, expected output, and when they are allowed to run.
For example:
cd services/platform-api && pytest -q
They need to know whether this is always safe, or only on changed backend files.
Supabase migration contract
They need the migration rules, not just the files:
additive-only history
unique timestamp prefixes
whether local reset is required for certain changes
Source paths:
E:\writing-system\supabase\migrations
E:\writing-system\.github\workflows\migration-history-hygiene.yml
Supabase validation workflow contract
They need the exact existing CI checks that local hooks should mirror or defer to.
Source paths:
E:\writing-system\.github\workflows\supabase-db-validate.yml
E:\writing-system\package.json
E:\writing-system\scripts\tests\supabase-db-workflows.test.mjs
E:\writing-system\scripts\tests\supabase-extension-replay-guardrails.test.mjs
E:\writing-system\scripts\tests\supabase-migration-reconciliation-contract.test.mjs
Edge-function inventory and deployment rules
They need to know what functions exist and whether any hook should validate or protect them.
Source paths:
E:\writing-system\supabase\functions
E:\writing-system\.github\workflows\deploy-edge-functions.yml
Supabase local-runtime prerequisites
This is critical if they cannot access it directly:
Does supabase db start work locally?
Is Docker required?
Are there machine-specific blockers?
Which commands are too heavy for hooks vs okay for CI only?
Secrets and credential model
They do not need the secrets themselves, but they do need:
which env vars / secrets exist
which commands require them
which hooks must never require production credentials
Otherwise they cannot plan skip/fallback behavior safely.
Observability contract
Even if the answer is “no observability changes,” they need evidence for that zero-case.
Source paths:
E:\writing-system\services\platform-api\OBSERVABILITY.md
E:\writing-system\services\platform-api\app\observability
They need to know whether any hook should enforce telemetry-related tests or just code/workflow guardrails.
Backend file-change scope map
They need the exact mapping from file areas to hook behavior, for example:
services/platform-api/** -> pytest smoke
supabase/migrations/** -> migration guardrail tests
supabase/functions/** -> edge-function validation path
Without this, the hook plan will be too vague or too expensive.
Runtime cost budget
For each backend check, tell them:
pre-commit vs pre-push vs CI only
expected runtime
acceptable skip conditions
This is required to plan 10-15 hooks without making local dev miserable.
Locked acceptance criteria
You need to tell them what “done” means for backend-related hooks.
Example:
migration edits are blocked locally unless guardrail tests pass
edge-function-only changes do not trigger full DB reset hooks
backend hooks fail fast and are path-scoped, not global
If you want the shortest useful handoff, give them this exact bundle:

E:\writing-system\package.json
E:\writing-system\.github\workflows\supabase-db-validate.yml
E:\writing-system\.github\workflows\migration-history-hygiene.yml
E:\writing-system\.github\workflows\deploy-edge-functions.yml
E:\writing-system\scripts\tests\supabase-db-workflows.test.mjs
E:\writing-system\scripts\tests\supabase-extension-replay-guardrails.test.mjs
E:\writing-system\scripts\tests\supabase-migration-reconciliation-contract.test.mjs
E:\writing-system\services\platform-api\pyproject.toml
E:\writing-system\services\platform-api\requirements.txt
E:\writing-system\services\platform-api\app\api\routes
E:\writing-system\services\platform-api\OBSERVABILITY.md
E:\writing-system\supabase\migrations
E:\writing-system\supabase\functions
And then add one human-written note answering these 5 questions:

Which backend checks are safe for pre-commit?
Which are only safe for pre-push?
Which must remain CI-only?
Does local Supabase work on this machine right now?
Are there any required secrets or services the planner cannot infer from files?
That is the minimum real backend packet.

If you want, I can turn this into a planner handoff checklist document you can reuse whenever someone has to write a plan without direct Supabase access.



