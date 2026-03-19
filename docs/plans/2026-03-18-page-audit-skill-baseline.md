# Page Audit Skill Baseline

This note captures the gap the final audit skill needs to close.

## Pressure Scenario

One built page in the repo must be checked against canonized specs under `web-docs/specs`, fixed where inconsistent, and then verified against a local rendered URL.

## Baseline Risks Without The Skill

- Skip the source audit and only eyeball the rendered output.
- Use generic HTML or the wrong component library when specs require a mapped component.
- Treat tokens, shell, typography, and day/night rules as optional.
- Fix code without preserving a deterministic audit record.
- Verify inconsistently, or skip rendered verification after fixing.

## Success Criteria For The Skill

- Stay one page at a time.
- Read canonized specs from `web-docs/specs`.
- Audit source first, then rendered output.
- Report inconsistencies, fix them, and verify again.
- Emit one deterministic audit report artifact each run.
