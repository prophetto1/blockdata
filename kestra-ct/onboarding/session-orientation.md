# Kestra Session Orientation

## Purpose

Use this file first in a fresh worker session to orient the worker before any page work starts.

## Repo Roots

- Windows repo root: `E:\writing-system\`
- Ubuntu repo root: `/home/jon/blockdata`

All `kestra-ct/...`, `web-kt/...`, and `supabase/functions/...` paths in the CT are repo-relative.

Examples:

- `kestra-ct/page-registry.yaml`
  - Windows: `E:\writing-system\kestra-ct\page-registry.yaml`
  - Ubuntu: `/home/jon/blockdata/kestra-ct/page-registry.yaml`
- `web-kt/src/routes/routes.js`
  - Windows: `E:\writing-system\web-kt\src\routes\routes.js`
  - Ubuntu: `/home/jon/blockdata/web-kt/src/routes/routes.js`

## Active Control Tower

- Active CT: `kestra-ct/`
- Reference archive only: `docs-approved/reference/kt-ct/`

Do not create a second CT root.

## What Is Already Complete

- preparation and assessment work is complete
- the CT-side onboarding docs exist
- the CT-side generated type references exist
- the page registry exists
- the first seeded packet exists for `flows_list`

## What Is Not Yet Complete

- there is no finished full-surface packet set yet
- there is no implemented compatibility gateway serving Kestra paths on `localhost:8080`
- there is no completed `kestra-flows` runtime adapter yet
- there is no approved type-promotion task yet

## Current Worker Expectation

The worker is expected to execute one page at a time from the master registry, starting with `flows_list`, unless explicitly reassigned.

The worker is not expected to invent:

- a second CT process
- a new identity model
- a replacement routing model
- a surprise redesign

## Immediate Files To Read

1. `kestra-ct/onboarding/status-model.md`
2. `kestra-ct/onboarding/worker-instructions.md`
3. `kestra-ct/onboarding/page-worker-loop.md`
4. `kestra-ct/onboarding/page-investigation-procedure.md` — step-by-step procedure for packet + capture phases
5. `kestra-ct/onboarding/page-implementation-procedure.md` — step-by-step procedure for implementation phase
6. `kestra-ct/onboarding/windows-worker-execution-instructions.md` on Windows
6. `kestra-ct/onboarding/adapter-layout.md`
7. `kestra-ct/onboarding/web-kt-baseline.md`
8. `kestra-ct/onboarding/verification-matrix.md`
9. `kestra-ct/page-registry.yaml`
