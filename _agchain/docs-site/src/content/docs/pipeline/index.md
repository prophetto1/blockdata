---
title: Overview
description: Build-time pipeline — builders and sealing for benchmark bundles.
sidebar:
  order: 0
---

The build pipeline turns benchmark-specific datasets into benchmark-ready artifacts. All build-time operations use local inputs (no network retrieval).

## Build stages

```
Raw benchmark datasets
    ↓
Benchmark dataset + schema
    ↓
RP Builder (scripts/rp_builder.py)
    -> datasets/rps/rpv1__<caseId>/
    ↓
EU Builder (scripts/eu_builder.py)
    -> datasets/eus/<benchmark_id>/<eu_id>/{p1,p2,ground_truth}.json
    ↓
Benchmark Builder (runspecs/.../benchmark_builder.py)
    -> benchmark/{benchmark,plan}.json + steps + judge prompts
    ↓
Bundle Sealer
    -> manifest.json + signature.json at bundle root
```

Note: the **datasets and schema are benchmark-owned** (e.g., Legal-10), not platform-owned.

