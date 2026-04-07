# FDQ — Formal Delivery Query Specifications

Self-contained specs for each evaluation step. Each FDQ includes:
- Prompt template (system + user messages)
- Output contract (JSON schema the model must return)
- Ground truth extraction (SQL or deterministic logic)
- Scoring algorithm
- Citation normalization rules

## Reading Order

1. `00-TEMPLATE-v2.md` — FDQ template; defines the standard structure all FDQs follow
2. `../_essentials/fdq/01-ka-sc.md` — **d1: Known Authority / Supreme Court** (deterministic scoring, MVP step)
3. `../_essentials/fdq/09-irac-without-rp.md` — **d2/d9: IRAC closed-book** (judge-scored, MVP step)
4. `../_essentials/fdq/10-irac-with-rp.md` — **j3/j10: IRAC open-book** (judge-scored, MVP step)
5. Steps 02-08 — future 10-step chain steps (not needed for 3-step MVP)

## Post-Chain Scorers (`post/`)

These run after all model steps complete:

- `../_essentials/fdq/post/irac-pair-scoring.md` — MEE rubric judge protocol; grades d2 vs j3 IRAC pair (AUTHORITATIVE)
- `../_essentials/fdq/post/citation_integrity.py.md` — Citation extraction regexes, validity checking, RP usage metrics
- `../_stale/fdq/post/judge-evaluation-both-iracs.md` — Earlier judge prompt version (superseded by `post/irac-pair-scoring.md`)

## Source Code Mapping

| FDQ | Implementation |
|-----|---------------|
| 01-ka-sc | `runspecs/3-STEP-RUN/scorers/d1_known_authority_scorer.py` |
| 09-irac / 10-irac | Judge call in `runspecs/3-STEP-RUN/run_3s.py` |
| post/citation_integrity | `runspecs/3-STEP-RUN/scorers/citation_integrity.py` |
| post/irac-pair-scoring | Judge prompt in `runspecs/3-STEP-RUN/benchmark/judge_prompts/irac_mee_pair_v1.json` |

## Key Invariant

FDQs are **self-contained by design**. Do not split their contents across folders.
The shipped MVP FDQ contracts were moved to `../_essentials/fdq/`. This folder now primarily carries the non-MVP future-step FDQs plus the index.
