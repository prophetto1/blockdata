# <Page Title> Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make one Kestra page work unchanged against the local backend and `kt.*` tables.

**Architecture:** Keep the page unchanged. Implement only the smallest Kestra-compatible backend contract required for this page. Back the endpoint with one query layer and one mapper layer. Use `kt-ct/generated/database.types.kt.ts` for DB typing and `kt-ct/generated/kestra-api/types.gen.ts` for API DTO typing.

**Tech Stack:** `web-kt`, generated Kestra client, backend adapter endpoint, Supabase/Postgres `kt.*`

---

### Task 1: Confirm Contract

**Files:**
- Modify: `kt-ct/tasks/<page_key>.capture.md`
- Reference: `openapi.yml`

**Step 1: Verify the exact route and store or client call**

Run the relevant code search and confirm the page boundary.

**Step 2: Verify the exact upstream endpoint**

Confirm the method and path in `openapi.yml`.

**Step 3: Update capture doc**

Record only observed facts.

### Task 2: Write Failing Test

**Files:**
- Create/Modify: `<backend test path>`

**Step 1: Write the failing test**

Test the smallest page-critical behavior first.

**Step 2: Run the test to verify it fails**

Record the command and expected failure.

### Task 3: Implement Query Layer

**Files:**
- Create/Modify: `<query module path>`

**Step 1: Add the smallest query for the page**

Support only the page scope.

**Step 2: Run the targeted tests**

### Task 4: Implement Mapper

**Files:**
- Create/Modify: `<mapper module path>`

**Step 1: Map `kt.*` data to exact Kestra payload shape**

Use `kt-ct/generated/database.types.kt.ts` plus `kt-ct/generated/kestra-api/types.gen.ts`.

**Step 2: Run the targeted tests**

### Task 5: Implement Adapter Endpoint

**Files:**
- Create/Modify: `<route handler path>`

**Step 1: Add the endpoint**

Use the exact Kestra-compatible method and path.

**Step 2: Run the targeted tests**

### Task 6: Wire the Page

**Files:**
- Modify: `<page/store/client path>`

**Step 1: Point the page at the local compatible endpoint or generated client**

**Step 2: Run the page-specific verification**

### Task 7: Verify and Record Evidence

**Files:**
- Modify: `kt-ct/tasks/<page_key>.verify.md`

**Step 1: Run the verification commands**

**Step 2: Record evidence only**

## Backend Import Rule

- Backend code may import DTO types from `kt-ct/generated/kestra-api/types.gen.ts`.
- Backend code must not import from `kt-ct/generated/kestra-api/sdk/*.gen.ts`.
- If a needed type exists only behind the SDK layer, stop and ask for review.

