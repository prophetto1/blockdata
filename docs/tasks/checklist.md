Production auth landing bug

Highest priority.
After Google login, users can end up on / and the site still looks logged out.
The intended fix is the auth-aware landing/nav work in Landing.tsx, PublicNavModern.tsx, and Landing.test.tsx.
This still needs final deploy/verification on prod.
Production auth verification

Verify the real flow on blockdata.run end to end:
login with Google
return from Supabase callback
authenticated user lands in /app or is redirected there from /
UI no longer appears logged out
Possible Supabase auth redirect config check

Only if the frontend fix is deployed and the issue still happens.
Then check that production auth redirect config includes https://blockdata.run/auth/callback.
Vercel build fix landing

The PDF.js Express fallback fix was implemented in syncPdfjsExpressAssets.mjs with tests in syncPdfjsExpressAssets.test.mjs.
This looks resolved, but it is part of the current web change set.
Generated artifact cleanup / commit hygiene

There were generated inventory file changes from build runs, including component-inventory.md.
Those need to be intentionally kept or cleaned before finalizing the web changes.
What is not an ongoing task from this chat:

Supabase SQL migration reconciliation
“is the DB up to date?”
migration application to your one Supabase project
Those were already treated as green.


-------------

Models

The main Models page is still the wrong product surface. It should be provider list + connect/test/save API key, but current implementation still carries target-catalog behavior. See 2026-03-31-agchain-models-surface-implementation-plan-v2.md and 2026-04-01-agchain-models-compliance-remediation-plan.md.
The split is not yet formally defined: Models user surface vs Model Catalog Admin surface vs benchmark-time model selection.
The admin/catalog surface for curated model targets still needs to be defined.
The benchmark-side model-selection surface still needs at least a contract, even if the full wizard is not built yet.
Current Models frontend is not in final approved shape.
Models backend / deployment

The backend seam is still model-target-aware, with provider credentials saved provider-wide through target-anchored routes. That is understood now, but not yet redesigned at the API/UI-contract level.
The remediation proof is still open because deployed platform-api behavior was blocked: connect-key / disconnect-key returned 404, and refresh-health returned 500 in the deployed environment. That leaves R3 incomplete in 2026-04-01-agchain-models-compliance-remediation-plan.md.
Tools

Tools is still incomplete against its plan. The benchmark workbench ownership is not fully built, and the current workbench page is still not the intended finished surface.
MCP/discovered-child-tool preview/selection UX is still missing from the user-facing editor flow.
Some Tools frontend expectations/tests had already drifted from the current implementation.
App shell / page-header work

The generic shell-header pattern was only partially corrected.
The top command bar/layout still needed proper pattern-level fixing so page title/description sit correctly in the app shell next to the day/night and mode toggles, instead of awkward offsets/overlap.
Related placeholder/header cleanup on some AGChain pages was still not fully resolved.
Documentation / planning

2026-04-03-agchain-models-page-status-report.md was mostly good, but still benefited from a few clarifications:
v2 introduced the bad target-aware surface
remediation froze it
provider credential scope is (user_id, provider_slug)
current workspace is not in a final approved state
