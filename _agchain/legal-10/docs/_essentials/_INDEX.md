# Essentials Index

This folder contains the smallest set of docs that remain authoritative for the shipped Legal-10 MVP no matter what.

## Absolute Sources

1. `mvp/M1-buildtime-packaging-sealing-dev-brief.md`
   - Highest authority for bundle layout, schema shape, and sealing requirements.
2. `platform/inter-step-requirements.md`
   - Highest authority for runtime behavior, staging, admission, state, and audit semantics.
3. `fdq/01-ka-sc.md`
   - Canonical d1 step contract.
4. `fdq/09-irac-without-rp.md`
   - Canonical d2 step contract.
5. `fdq/10-irac-with-rp.md`
   - Canonical j3 step contract.
6. `fdq/post/irac-pair-scoring.md`
   - Canonical judge grading contract.
7. `fdq/post/citation_integrity.py.md`
   - Canonical post-chain citation-integrity contract.

## Why These Are Here

These are the docs the current shipped MVP cannot function without:

- one bundle/schema authority
- one runtime authority
- the three shipped step contracts
- the two shipped post-chain scoring contracts

Everything else in `legal-10/docs/` is either supporting, forward-looking, implementation-reference, or stale.

## Notes

- The pre-existing analysis docs already in `_essentials/` are supporting research notes, not part of the absolute source-of-truth set above.
- The broader folder indexes remain in their original locations so the corpus still has navigable topic-based structure.
