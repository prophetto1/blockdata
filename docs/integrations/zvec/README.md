# Zvec Integration

Status: Prescriptive specification (pre-implementation)

This directory defines the BlockData -> Zvec integration contract.

Use this package when the goal is to convert BlockData outputs (JSON/JSONL first, then CSV/MD/TXT via translators) into vector-searchable records in Zvec with stable IDs and filterable metadata.

## Documents

- `zvec-integration-contract.md`: canonical ingestion contract and schema mapping.
- `zvec-adapters-and-transformers.md`: required adapters/translators/transformers by source format.

## Scope

In scope:
- Canonical intermediate record shape for vectorization.
- Zvec collection schema contract.
- Ingestion idempotency and update semantics.
- Translator requirements for JSON/JSONL/CSV/MD/TXT.

Out of scope:
- UI implementation details.
- Worker runtime implementation plan.
- Provider-specific model selection policy.
