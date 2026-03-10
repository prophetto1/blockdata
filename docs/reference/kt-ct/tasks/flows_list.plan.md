# Flows List Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Status:** seeded

**Goal:** Make the Kestra flows list page work unchanged against a local compatibility endpoint backed by `kt.flows`.

**Architecture:** Keep `web-kt/src/components/flows/Flows.vue` unchanged on the first pass. Implement the smallest read-only Kestra-compatible backend contract for `GET /api/v1/{tenant}/flows/search`. Use `kt-ct/generated/database.types.kt.ts` for DB typing and `kt-ct/generated/kestra-api/types.gen.ts` for API DTO typing.

**Tech Stack:** `web-kt`, Kestra `openapi.yml`, CT-staged DB types, CT-staged API types, Supabase/Postgres `kt.*`

---

## Seeded Inputs

- Capture file: `kt-ct/tasks/flows_list.capture.md`
- Route: `/:tenant?/flows`
- Page component: `web-kt/src/components/flows/Flows.vue`
- Store method: `web-kt/src/stores/flow.ts -> findFlows`
- Upstream endpoint: `GET /api/v1/{tenant}/flows/search`
- Candidate tables:
  - `kt.flows`
  - `kt.executions`

## Fixed Success Criteria

- page renders
- list loads
- search works
- pagination works
- response shape matches the Kestra contract

## Plan Authoring Checklist

Expand this seeded file into a full task-by-task plan before coding.

The completed plan must define:

- backend test path
- query module path
- mapper module path
- route handler path
- page wiring path
- verification commands

## Backend Import Rule

- Backend code may import DTO types from `kt-ct/generated/kestra-api/types.gen.ts`.
- Backend code must not import from `kt-ct/generated/kestra-api/sdk/*.gen.ts`.
- If a needed type exists only behind the SDK layer, stop and ask for review.

