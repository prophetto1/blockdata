---
title: Ingest & Conversion
description: Upload ingestion, format routing, conversion, and parsing tracks.
sidebar:
  label: Overview
  order: 0
---

BlockData ingestion produces an immutable block inventory for each uploaded source file, using a format-specific parsing track.

## End-to-end flow

Conceptual overview of the ingestion pipeline.

1. Upload source bytes to a project.
2. Detect `source_type` and route to a parsing track.
3. Convert (when required) into a representation that can be parsed into blocks.
4. Extract normalized blocks + immutable metadata.

## Parsing tracks

Format routing determines which track processes each source type. See [Parsing Tracks](/docs/key-concepts/blocks/parsing-tracks/) for the canonical routing table and capability comparison.

## Deterministic identity + export contract

Immutable field definitions and pairing rules live in:
- [Immutable Fields](/docs/key-concepts/schemas/immutable-schema/)
- [Canonical Export Contract](/docs/key-concepts/architecture/canonical-export/)

## Operational reliability

Format verification is tracked as a gate in the roadmap. Smoke matrix and results:
- [Current Ongoing Work](/docs/roadmap/ongoing-work/)
