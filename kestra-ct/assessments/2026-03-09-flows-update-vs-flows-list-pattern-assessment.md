# flows_update vs flows_list pattern assessment

Date: 2026-03-09
Reviewer: Codex
Scope: compare the `flows_update` page artifacts against the completed `flows_list` page artifacts and determine whether the answer pattern is identical or very similar

## Verdict

Conditional Pass

The `flows_update` page shows a very similar answer pattern to `flows_list` in `capture.md`, but the page packet is not aligned end to end because `implement.md` and `verify.md` are still template-level and the page does not yet have a `results.md` companion.

## Findings

### Major

- `capture.md` is strongly aligned in pattern.
  - Both pages use the same core sections:
    - observed facts
    - request shape
    - response shape
    - mapping notes
    - risks
  - Both captures trace from route and component to store method, endpoint contract, candidate tables, and UI mapping.
  - `flows_update` is more expansive because the page itself is much larger. It documents on-load secondary endpoints and future tab surface in addition to the primary endpoint.

- The answer style is similar, not identical.
  - `flows_list/capture.md` is narrower and more compressed around one paged list endpoint plus one follow-on dependency.
  - `flows_update/capture.md` uses the same structured style but expands into:
    - primary endpoint
    - on-load secondary endpoints
    - tab surface endpoints
    - more detailed mapping rows
  - That difference is appropriate for the page complexity.

- The page packet is not pattern-aligned at the full page level.
  - `flows_list/implement.md` is filled with exact runtime targets, contract rules, verification commands, and stop conditions.
  - `flows_update/implement.md` is still a blank template.
  - `flows_list/verify.md` records real evidence and blockers.
  - `flows_update/verify.md` is still a blank template.

### Minor

- `flows_update` does not have a `results.md` file, while `flows_list` does.
  - That means the investigative narrative exists only in `capture.md` for `flows_update`, not in a separate scratch/result note.

- The frontmatter naming is inconsistent between the two page folders.
  - `flows_list/implement.md` uses `doc_type: kestra_page_implementation`
  - `flows_update/implement.md` uses `doc_type: kestra_page_implement`
  - `flows_list/verify.md` uses `doc_type: kestra_page_verification`
  - `flows_update/verify.md` uses `doc_type: kestra_page_verify`
  - `flows_list/capture.md` uses `status: completed`
  - `flows_update/capture.md` uses `status: complete`

## Comparison summary

### capture.md

Very similar pattern.

Both pages:
- start from route, component, and store
- derive the preserved Kestra endpoint
- describe request shape
- describe response shape
- map UI fields back to `kt.*`
- record blockers and risks

`flows_update` is simply more detailed because the page surface is larger.

### implement.md

Not similar in maturity.

- `flows_list/implement.md` is execution-ready
- `flows_update/implement.md` is still a template

### verify.md

Not similar in maturity.

- `flows_list/verify.md` records real execution outcome
- `flows_update/verify.md` is still a template

## Final conclusion

If the question is:

"Does the other worker answer pages in the same pattern?"

Then the answer is:

- `capture.md`: yes, very similar
- full page packet: no, not yet

So `flows_update` currently matches the `flows_list` answer pattern only at the capture stage, not at the implementation/verification stage.
