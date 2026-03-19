# Playwright Layout Skill Baseline

This note captures the failure modes the new skill should prevent.

## Pressure Scenario

The user wants a reusable skill, not a one-off Botpress analysis. They may mention monitor resolution, ask for a similar layout, or provide only a URL and a loose target like "desktop."

## Baseline Risks Without The Skill

- Treat display resolution as the same thing as browser viewport.
- Anchor the workflow to Botpress instead of making it page-agnostic.
- Capture screenshots without recording metadata needed to reuse the measurements.
- Report guessed spacing or typography instead of rendered values from Playwright.
- Overstate responsive behavior from one viewport.

## Success Criteria For The Skill

- Make viewport metadata mandatory.
- Keep the workflow generic for any live webpage.
- Require screenshot plus measured values, not screenshots alone.
- Separate observed facts from inference.
- Produce a structure that can feed a parity spec or styling specification.
