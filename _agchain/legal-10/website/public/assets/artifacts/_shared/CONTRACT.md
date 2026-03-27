# L10 Artifacts Shell Contract

This folder defines the **static shell** (top nav, side nav, layout) for all HTML artifacts under `docs/assets/artifacts/`.

## Non-negotiables

- Every artifact page must:
  - include `./_shared/l10-shell.css`
  - include `./_shared/l10-shell.js`
  - define exactly one `<main id="l10-page">...</main>` as the page content root
- Navigation and layout must only be edited in:
  - `docs/assets/artifacts/_shared/nav.json`
  - `docs/assets/artifacts/_shared/l10-shell.css`
  - `docs/assets/artifacts/_shared/l10-shell.js`

## How to create a new page

Copy `docs/assets/artifacts/_template.html` to `docs/assets/artifacts/<name>.html` and edit only the content inside `<main id="l10-page">`.

