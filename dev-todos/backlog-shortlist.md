# Backlog Shortlist (Post-Audit)

Source: `implementation-audit.md` (only `Missing`, `Partial`, `Blocked` actions from `tbdv2`).  
Goal: shorter, implementation-viable grouped backlog.

## Prioritization Rule
1. Unblock platform-critical runtime/security contracts first.
2. Close high-leverage cross-cutting gaps (schema/runtime verification, CI/testing).
3. Defer future-phase work (`D7` assistant, `D8` phase 2/3) until core closure is complete.

## Grouped Shortlist

| Group ID | Module/Concern | Included Action IDs | Status Mix | Why It Is Grouped This Way | Exit Criteria |
|---|---|---|---|---|---|
| G1 | System Connectors (DB + Edge + Superuser UI + Worker) | `D1-A01..D1-A15`, `D4-A05`, `D4-A06` | Missing | Single architecture concern: platform-level credential authority and runtime precedence. | `system_ai_connectors` table + `superuser-ai-connectors` API + superuser UI + worker precedence + acceptance matrix passing. |
| G2 | Adapter Foundation (Pipeline Extensibility) | `D2-A01`, `D2-A02`, `D2-A03` | Missing | Single downstream adapter subsystem; deterministic behavior contract. | Interface versioning doc + `docling -> KG flatten v1` adapter + deterministic tests. |
| G3 | Export/Reconstruct Product Flow | `D2-A11` (partial), `D2-A12`, `D2-A13` | Partial/Missing | Single user flow from confirmed overlays to reconstructed output/download. | Export variants available + `reconstruct` function + DocumentDetail download action. |
| G4 | Integrations Surface + Connectors | `D6-A05`, `D2-A14`, `D2-A15`, `D2-A16`, `D2-A17` | Missing | Same product area: integrations UX entrypoint plus provider integrations. | `/app/integrations` app route/page exists + Neo4j/webhook/DuckDB-Parquet integrations wired. |
| G5 | Runtime/Env Verification Ops | `D2-A07`, `D2-A08`, `D2-A09`, `D2-A18`, `D5-A01`, `D5-A03`, `D8-A15` | Blocked/Missing | All require environment execution evidence rather than pure code edits. | Verified secrets + concurrency + E2E run flow + Cloud Run access-policy check + completed smoke/evidence logs. |
| G6 | Priority-7 Remaining Contract Gaps | `D8-A01` (partial), `D8-A08` (partial), `D8-A09` (partial), `D8-A11`, `D8-A16` (partial) | Partial/Missing | All are remaining closure items inside the P7 schema workflow contract. | Nested object parity + JSON escape hatch + sample block preview + reproducible phase-1 evidence closure. |
| G7 | UI/QA Hardening Baseline | `D2-A19`, `D2-A20` (partial), `D2-A21`, `D6-A12` (partial), `D6-A13` (partial) | Missing/Partial | Frontend reliability and verification are one deploy-risk domain. | Code-splitting pass + web tests baseline + error boundary/reconnect + accessibility criteria + smoke evidence. |
| G8 | CI/Security/Auth Completion | `D2-A22`, `D2-A23` (partial), `D2-A24` (partial), `D2-A25` (partial) | Missing/Partial | Platform operations/security lifecycle cluster. | CI workflows present + auth lifecycle complete + account controls complete + CSP/rate/session hardening validated. |
| G9 | Config Governance Closure | `D3-A02`, `D3-A03`, `D4-A01`, `D4-A03` | Missing | Single governance concern: authority precedence and editor ownership consistency. | `CFG-004` status resolved + historical label pass complete + provider editor ownership unified + precedence lock completed. |
| G10 | Future-phase Template Intelligence | `D7-A02`, `D7-A03`, `D8-A17` | Missing/Blocked | Explicitly future-scope work; grouped to avoid leaking into current closure sprint. | Scheduled phase window + assistant panel + recommendation/feedback capabilities implemented. |

## Immediate Sprint Cut (recommended)

If you want the shortest high-value backlog right now, start with only:

1. `G1` System Connectors (platform control/safety blocker)
2. `G5` Runtime/Env Verification Ops (proves behavior is real)
3. `G6` Priority-7 Remaining Contract Gaps (close active schema gate)
4. `G7` UI/QA Hardening Baseline (reduce regression risk)

## Excluded From Immediate Sprint
- `G10` (future-phase by design)
- Most of `G4` integrations beyond route parity unless tied to immediate launch goals.
