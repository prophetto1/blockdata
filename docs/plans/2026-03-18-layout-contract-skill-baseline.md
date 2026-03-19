# Layout Contract Skill Baseline

This note captures the gap the second skill needs to close.

## Pressure Scenario

The first skill freezes a live page into deterministic artifacts. Without a second skill, the next agent can still drift by writing different spec formats, widening allowed deviations, or confusing "similar" with "freely inspired."

## Baseline Risks Without The Skill

- Produce different contract shapes from the same capture.
- Treat "similar" as permission to redesign the page.
- Lose the rule that only CI/BI swaps and explicit user requests may differ.
- Blend live-site guesses into the frozen capture without labeling them.
- Emit planning notes instead of a build-ready reproduction contract.

## Success Criteria For The Skill

- Consume the capture artifacts as the primary source.
- Emit one fixed output type: a page reproduction contract.
- Preserve identical structure and implementation except for CI/BI swaps and explicit user requests.
- Allow a live reference check only to resolve missing facts.
- Keep parity and similar as contract modes, not output-format changes.
