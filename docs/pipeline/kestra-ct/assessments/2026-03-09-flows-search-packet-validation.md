---
title: Flows Search Packet Validation
date: 2026-03-09
reviewer: Codex
verdict: Pass
---

## Result

The current `flows_search` packet and capture are materially correct for the top-section route and request identity.

## Verified Facts

- The route is `flows/search` at `/:tenant?/flows/search`.
- The component is `web-kt/src/components/flows/FlowsSearch.vue`.
- The store method is `searchFlows()` in `web-kt/src/stores/flow.ts`.
- `searchFlows()` calls `GET /api/v1/main/flows/source`.
- The registry entry and packet header match that request path.

## Note

An earlier review comment said the upstream path should be `/api/v1/main/flows/search`. That comment was incorrect for `flows_search`. `/api/v1/main/flows/search` belongs to `flows_list`; `flows_search` uses `/api/v1/main/flows/source`.
