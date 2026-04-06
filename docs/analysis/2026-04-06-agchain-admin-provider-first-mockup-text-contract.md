# AGChain Admin Models: Provider-First Mockup Text Contract

## Purpose

This document describes the AGChain admin models page as a text-only visual contract. It is written so a designer or UI-generation model with no image access can reproduce the intended page shape, hierarchy, states, and behaviors.

The core correction is simple: the page must teach the true relationship of the data model.

- First, an admin adds or edits a provider.
- Then, inside that provider, the admin adds or edits one or more model targets.
- The page must therefore feel provider-first, not like two unrelated flat tables.

This is an admin-only registry workspace. It is not a credential page. It does not contain API key entry, testing, or secret management.

## Overall Page Identity

This page lives inside the existing AGChain Admin shell.

- Left app rail remains unchanged.
- Top breadcrumb remains unchanged.
- Use existing platform shell spacing, panel styles, typography, dark theme tokens, button treatments, and modal primitives.
- The new work is the composition of the page body only.

The page title is still effectively `Models`, but the content should visually read as:

- provider registry first
- provider-scoped model catalog second

The page should feel like one connected workspace, not two stacked admin utilities.

## Primary Mental Model

The page is a two-region workspace:

1. A provider selector region.
2. A provider detail region that shows the selected provider's models.

Think of it as:

- choose provider
- review provider metadata
- manage that provider's model targets underneath

Do not think of it as:

- one provider table
- then somewhere else on the page a separate global model table

## High-Level Layout

Use a two-column desktop layout inside the main page content area.

### Left Column

This is a provider navigation panel.

- Fixed visual width relative to the content area, roughly narrow-sidebar width.
- It should feel like a vertical tab list, not a spreadsheet.
- It contains one stacked row per provider.
- The selected provider row is visibly highlighted.

### Right Column

This is the active provider workspace.

- Wider main content column.
- Contains two stacked cards:
  - provider summary card
  - model targets card

The entire page should be readable as: "selected provider and everything under it."

## Left Provider Navigation Panel

This panel is a rounded, elevated surface matching existing admin card styling.

At the top of the panel:

- section title: `Providers`
- one short helper sentence:
  - example meaning: "Manage the providers that can own curated AGChain model targets."
- primary action button aligned to the top-right or placed directly below title:
  - `Add Provider`

Below that is a vertical list of provider items.

### Provider Item Anatomy

Each provider item is a compact block row with:

- first line: display name
- second line: provider slug in muted text
- optional small category label:
  - `Model provider`
  - `Cloud provider`
- optional enabled/disabled status badge

Each item should have enough padding to feel clickable.

The selected item should be clearly different:

- stronger background
- visible border or glow
- stronger text contrast

### Seeded Starting Providers For Mock

Use only these provider rows for the initial visual draft:

- `OpenAI`
- `Anthropic`
- `Vertex AI`

OpenAI and Anthropic are `Model provider`.
Vertex AI is `Cloud provider`.

OpenAI should be selected in the default mock.

## Right Column: Provider Summary Card

This card is the first card in the main column.

Its purpose is to show and edit metadata about the selected provider, not its credentials.

### Card Header

Top-left:

- provider display name as the card title
- smaller provider slug underneath

Top-right:

- `Edit Provider` button

Optional secondary information in the header area:

- category
- credential form kind
- supported auth kinds
- enabled/disabled badge

### Card Body

Use a clean information grid, not a form by default.

Show metadata as labeled read-only fields or definition rows:

- `Category`
- `Credential Form`
- `Supported Auth`
- `Default Probe Strategy`
- `Custom Base URL`
- `Model Args`
- `Documentation`
- `Last Update`
- `Notes`

This should feel like a provider profile card.

Do not make the admin stare at raw JSON.
Humanize values where possible.

Examples:

- `basic_api_key` should display as `Basic API key`
- `vertex_ai` should display as `Vertex AI service account`
- `api_key` should display as `API key`
- booleans should display as `Supported` / `Not supported`

`Documentation` should be a real link-style element.

## Right Column: Model Targets Card

This card sits directly under the provider summary card.

It is the main working area.

This card is explicitly scoped to the selected provider.

### Card Header

Top-left:

- title: `Model Targets`
- helper line that mentions the selected provider
  - example meaning: "Curate the model targets available under OpenAI."

Top-right:

- search input with placeholder like `Search OpenAI models`
- primary action button: `Add Model`

Very important:

- when this card is showing OpenAI, every row in the table belongs to OpenAI
- changing provider in the left rail changes the contents of this card
- `Add Model` opens a model dialog with provider already selected and locked to the active provider by default

## Model Targets Table

Use one table inside the model targets card.

Recommended columns:

- `Model`
- `Qualified Model`
- `Compatibility`
- `Status`
- `Last Update`
- `Actions`

### Column Meanings

`Model`
- first line: human label like `GPT-4.1`
- second line: raw model name or short identifier in muted text

`Qualified Model`
- provider-qualified identifier like `openai/gpt-4.1`

`Compatibility`
- compact human-readable text such as:
  - `Evaluated`
  - `Judge`
  - `Evaluated, Judge`

`Status`
- `Enabled` or `Disabled`
- use clear colored text or a small badge

`Last Update`
- timestamp in the platform's existing table style

`Actions`
- text button: `Edit`

Do not overload the table with too many technical columns at once.
Provider-level metadata belongs in the provider summary card, not repeated in every model row.

## Empty States

### No Providers Exist

If there are zero providers:

- left panel still appears
- provider list area shows a centered empty state:
  - `No providers yet`
  - one sentence explaining the admin must add a provider before models can be curated
- right column should show a complementary empty state, not a broken blank surface
- primary CTA: `Add Provider`

### Provider Exists But No Models Yet

If a provider is selected but has zero model targets:

- provider summary card still shows normally
- model targets card shows empty state:
  - `No model targets for OpenAI yet`
  - one sentence explaining that models are curated under the selected provider
- primary CTA: `Add Model`

## Interaction Model

### Selecting a Provider

When the user clicks a provider in the left panel:

- that provider becomes selected
- the right column refreshes to that provider's metadata and model list
- the page should feel immediate, like switching tabs

### Adding a Provider

`Add Provider` opens a modal for provider metadata.

This modal includes the provider-definition fields already supported by the backend:

- display name
- provider slug
- category
- credential form kind
- env var name
- docs URL
- supported auth kinds
- default probe strategy
- default capabilities
- supports custom base URL
- supports model args
- enabled
- notes

Use the platform's standard admin modal shell.
This is an admin metadata editor, not an end-user credentials dialog.

### Editing a Provider

`Edit Provider` opens the same modal prefilled.

### Adding a Model

`Add Model` always opens in the context of the active provider.

The model modal should:

- show the active provider already selected
- either lock the provider field or make it visually obvious that the model is being created under the current provider

The model modal includes:

- label
- model name
- qualified model
- auth kind
- probe strategy
- API base
- evaluated-compatible checkbox
- judge-compatible checkbox
- enabled checkbox
- notes

### Editing a Model

`Edit` on a model row opens the same model modal prefilled.

## Important Visual Rules

- Never show providers and models as two unrelated global tables on the same screen.
- The model list must always visually belong to the selected provider.
- The selected provider must be obvious at first glance.
- Reuse existing platform tokens and shell primitives; do not invent a separate aesthetic system.
- Keep the page calm, dark, and administrative, but make the relationship between provider and models unmistakable.

## Default Mock State To Render

For the first mock, render this exact scenario:

- OpenAI selected in the left provider panel
- Anthropic and Vertex AI visible but unselected
- OpenAI provider summary visible in the top-right card
- OpenAI model targets visible in the lower-right card
- include several OpenAI models in the table:
  - GPT-4.1
  - GPT-4.1 Nano
  - GPT-4o
  - GPT-4o Mini
  - o3
- all rows should read as belonging to OpenAI without repeating the provider name in every row

## Backend Alignment Notes For Mock Designers

The mock should align with this already-supported backend relationship:

- one provider registry row
- many model target rows under that provider

So the redesign is mostly a page-composition correction, not a data-model invention.
