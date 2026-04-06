# Plan State → Skill Mapping

## Primary mapping table

| Plan state | Primary skill(s) | When to use it | Notes |
|---|---|---|---|
| To Do | `investigating-and-writing-plan` | Fresh work with no trusted plan yet | Use when the work needs initial investigation and a new implementation plan. |
| To Do | `taking-over-investigation-and-plan` | There is already a draft plan, stale notes, partial investigation, or inherited work | Use when taking over existing material and needing to verify, salvage, reconcile, or replace it. |
| Under Review (pre-implementation) | `evaluating-plan-before-implementation` | A draft plan exists and needs to be assessed before approval | This is the pre-implementation quality/completeness gate. |
| Approved | `executing-approved-plans` | The plan is approved and implementation is about to begin | Treat the approved plan as a contract, not a loose checklist. |
| In Progress | `executing-approved-plans` | Implementation is actively underway | This remains the default implementation skill while work is being executed. |
| In Progress (bug / failure / drift) | `comprehensive-systematic-debugging` | Tests fail, behavior is wrong, or execution drifts from expectations | This is the interrupt skill for root-cause tracing and corrective diagnosis. |
| Implemented | `evaluating-implemented-plan` | A worker claims the implementation is complete | This should be the first post-implementation evaluation step. |
| Implemented | `blind-implementation-review` | You want an independent second opinion on the built result | Best used after or alongside implementation evaluation; not the main first gate. |
| Under Review (findings returned) | `addressing-evaluation-findings` | An evaluator returned findings that must be resolved | Applies both to plan-evaluation findings and implementation-evaluation findings. |
| Verified | _Outcome state_ | Evaluation/remediation has cleared and the implementation is accepted | Usually reached after implemented-plan evaluation passes and any findings are resolved. |
| Closed | _No primary skill required_ | Work is complete and no further action is expected | Archival/end-of-lifecycle state. |

## Cross-cutting / repeatable mappings

| Situation | Skill | Why it maps more than once |
|---|---|---|
| Inherited work at the beginning | `taking-over-investigation-and-plan` | This is not just a starting state; it is a recovery/takeover mode. |
| Any unexpected bug or failure during execution | `comprehensive-systematic-debugging` | This can happen in multiple states, especially during implementation and remediation. |
| Findings returned from pre-implementation plan review | `addressing-evaluation-findings` | Used in plan revision mode. |
| Findings returned from post-implementation evaluation | `addressing-evaluation-findings` | Used in implementation remediation mode. |
| Desire for independent quality judgment | `blind-implementation-review` | Can be run after implementation and sometimes after remediation. |

## Recommended default sequence

| Step | State | Skill |
|---|---|---|
| 1 | To Do | `investigating-and-writing-plan` **or** `taking-over-investigation-and-plan` |
| 2 | Under Review (pre-implementation) | `evaluating-plan-before-implementation` |
| 3 | Under Review (findings) | `addressing-evaluation-findings` |
| 4 | Approved / In Progress | `executing-approved-plans` |
| 5 | In Progress (if issues appear) | `comprehensive-systematic-debugging` |
| 6 | Implemented | `evaluating-implemented-plan` |
| 7 | Implemented (optional second lens) | `blind-implementation-review` |
| 8 | Under Review (post-implementation findings) | `addressing-evaluation-findings` |
| 9 | Verified | outcome reached after passing evaluation/remediation |

## Practical rule of thumb

- **First gate after implementation:** `evaluating-implemented-plan`
- **Independent second opinion after implementation:** `blind-implementation-review`
- **Findings resolution skill:** `addressing-evaluation-findings`
- **Execution skill:** `executing-approved-plans`
- **Bug/failure interrupt skill:** `comprehensive-systematic-debugging`
- **Fresh planning skill:** `investigating-and-writing-plan`
- **Takeover/recovery planning skill:** `taking-over-investigation-and-plan`

