---
title: Source and Destination Integrations
description: Conceptual diagram of inputs, BlockData in the middle, and outputs.
sidebar:
  label: Source vs Destination
  order: 1
---

This diagram shows BlockData as the integration middle layer. Sources feed in, schemas shape outputs, and destinations receive standardized artifacts.

```mermaid
flowchart LR
  subgraph S[Sources (hosted data)]
    S1[Google Drive]
    S2[Cloud storage]
    S3[Databases]
    S4[SaaS / APIs]
    S5[Local files]
  end

  subgraph BD[BlockData]
    BD1[Ingest to Blocks]
    BD2[Schemas to Runs]
    BD3[Overlays to Review]
    BD4[Export to Artifacts]
  end

  subgraph D[Destinations (outputs)]
    D1[Databases / Warehouses]
    D2[Knowledge Graphs]
    D3[Vector stores]
    D4[Note apps / Docs]
    D5[APIs / Partner systems]
    D6[Metadata platforms]
    D7[File sinks (json/jsonl/csv/md/parquet)]
  end

  S1 --> BD1
  S2 --> BD1
  S3 --> BD1
  S4 --> BD1
  S5 --> BD1
  BD1 --> BD2 --> BD3 --> BD4
  BD4 --> D1
  BD4 --> D2
  BD4 --> D3
  BD4 --> D4
  BD4 --> D5
  BD4 --> D6
  BD4 --> D7
```

**Sources** are any systems that host data.  
**Destinations** are any systems or files that consume the outputs.

BlockData sits in the middle as the standardization layer. It normalizes inputs into blocks, applies schema-defined extraction, and emits clean artifacts for downstream use.
