# AGChain Provider Reference UI Text Contract

**Purpose:** Translate the visual/reference cues from `E:/agchain models- doc 1.pdf` into text so a text-only model can produce the same provider page and modal behavior without seeing the images.

**Primary reference:** `E:/agchain models- doc 1.pdf`

**Important scope rule:** Copy the interaction model, information hierarchy, and state behavior from the reference. Do **not** copy Braintrust's dark visual tokens. Use this repo's existing shell contract, spacing system, color tokens, typography, modal primitive, table primitive, icon-button primitive, and state-message/toast primitive.

## 1. Overall Page Shape

- This is a provider-management page inside the existing AGChain shell/settings shell.
- The content area is flat and operational, not marketing-like.
- The page starts with a simple title and one short subtitle.
- The core body is a provider list, grouped into category sections when categories exist.
- The reference shows two category groups:
  - `Model providers`
  - `Cloud providers`
- Each category group renders as a compact table-like list, not as a grid of cards.
- The list should feel like one continuous operational settings surface with thin row separators and minimal chrome.

## 2. Table Contract

Use these columns in this exact order:

1. `Provider`
2. `Credential Status`
3. `Last Update`
4. `Actions`

### Provider cell anatomy

Each row's first cell contains:

- provider logo/icon
- provider display name as the primary text
- env-var identifier as muted secondary text directly below the display name

Example mental model:

- `OpenAI`
  - `OPENAI_API_KEY`

### Actions cell anatomy

- Use one trailing row-end configure/edit action, visually equivalent to a pencil/edit affordance.
- Do not render multiple inline table buttons like `Test`, `Save`, `Remove` in the row itself.
- The row action opens the centered modal.
- The accessible label/tooltip can vary by state, but the visual affordance remains the same single row-end action.

## 3. Status Vocabulary

Use the agreed AGChain product copy, not Braintrust's exact status words.

### Organization page statuses

- `Not set`
- `Set`

### Project page statuses

- `Not set`
- `Set`
- `Inherited`

### Meaning of project states

- `Not set`: no project override and no organization credential available
- `Set`: a project-local credential exists and overrides any organization credential
- `Inherited`: no project-local credential exists; the organization credential is currently supplying the provider

## 4. Shared Modal Contract

For the common provider form used by most providers, the modal is a narrow centered credentials modal with this structure.

### Modal header

- Title: `Configure API key`
- Close `X` in the top-right corner

### Provider identity block

Immediately under the title:

- provider logo/icon
- provider name
- provider docs link under or beside the name

### Form body for the common 70% case

This is the `basic_api_key` form.

Field order:

1. `Name`
2. `API key`

#### `Name` field

- visually present
- read-only / non-editable
- shows the env-var identifier the system expects
- often displayed as a pill/chip-like read-only value

Example:

- label: `Name`
- value: `GROK_API_KEY`

#### `API key` field

- secure secret input
- single-line
- placeholder like `Enter API key`

#### Helper copy

- helper copy sits under the API key field
- it explains that the secret is stored securely/encrypted
- use our platform-standard secure-secret wording, not a random rewrite

### Modal footer buttons

The reference behavior is footer-button driven.

#### Always available in modal

- `Test key`

#### Primary action

- `Save` when no credential exists yet
- `Update` when a credential already exists

#### Destructive action

- `Remove` only when a removable stored credential exists for that scope

## 5. State-Based Footer Behavior

### Organization page

#### `Not set`

- row shows one configure/edit icon
- modal footer shows:
  - `Test key`
  - `Save`

#### `Set`

- row shows one configure/edit icon
- modal footer shows:
  - `Test key`
  - `Update`
  - `Remove`

### Project page

#### `Not set`

- row shows one configure/edit icon
- modal footer shows:
  - `Test key`
  - `Save`

#### `Set`

- row shows one configure/edit icon
- modal footer shows:
  - `Test key`
  - `Update`
  - `Remove`

#### `Inherited`

- row shows one configure/edit icon
- modal footer shows:
  - `Test key`
  - `Save`

Important:

- in `Inherited`, there is no project-local credential yet
- `Save` in this state creates a local override
- `Remove` is not shown in this state because there is no local project credential row to delete

## 6. Test-Key Behavior

This is the most important behavior from the PDF.

- `Test key` is manual only
- there is no auto-validation on paste or typing
- pressing `Test key` does **not** save
- pressing `Test key` does **not** close the modal
- pressing `Test key` does **not** update table row status
- pressing `Test key` does **not** change `Last Update`

### Where the result appears

- The result appears **outside** the modal as a page-level state message / toast
- It should feel anchored to the page shell, not embedded in the form body
- The reference placement is effectively a lower-right global toast/snackbar

### What should not happen

Do **not** reproduce Braintrust's inline in-modal success/error block behavior.

Specifically:

- no inline `API key validated` banner inside the modal
- no inline red error panel inside the modal body

### Result styling

- test success = green state message
- test failure = red state message

### Failure message shape

Default failure heading for the common provider form:

- `Unable to validate API key`

If backend/provider detail exists, show it as secondary text below the heading.

## 7. Save / Update Behavior

This is also explicitly called out by the PDF.

- `Save` and `Update` are **not gated** by successful test
- user can save:
  - without ever pressing `Test key`
  - after a successful test
  - after a failed test

### On successful save/update

The sequence is:

1. persist credential
2. close modal
3. update row state and timestamp
4. show success state message outside the modal

### Save success message

Use one shared success message regardless of prior test result:

- `Secret saved successfully`

The same save-success message is used whether:

- the key was tested and passed
- the key was tested and failed
- the key was never tested

## 8. Remove Behavior

### Organization page remove

- deletes the organization-scoped credential only
- row becomes `Not set`
- downstream project rows may fall back to `Not set` or lose `Inherited` if no other source exists

### Project page remove from `Set`

- deletes the project-local override only
- if an organization credential exists, row returns to `Inherited`
- if no organization credential exists, row returns to `Not set`

## 9. Category Grouping

The reference page is not a single undifferentiated table.

It groups providers by category.

For AGChain text-only generation, use backend-driven groups such as:

- `Model providers`
- `Cloud providers`

The category grouping must come from backend metadata, not from hard-coded frontend arrays.

## 10. What To Preserve From The Reference

These cues matter and must survive translation:

- provider list grouped into named categories
- flat operational settings layout
- provider name plus env-var subtitle in each row
- one trailing edit/configure affordance per row
- narrow centered modal
- modal title `Configure API key`
- provider identity block with docs link
- read-only `Name` field
- editable `API key` field
- helper encryption copy under the secret field
- `Test key` action in footer
- `Save` / `Update` action in footer
- out-of-modal toast/state messages for test results
- auto-close on successful save/update
- single save-success message regardless of prior test outcome

## 11. What Must Use Our Platform Instead Of The Reference

Do **not** copy these directly from Braintrust:

- dark-theme colors
- exact shadows
- exact border colors
- exact typography tokens
- exact sidebar shell
- exact toast component styling

Use our platform's:

- app shell
- settings shell
- tokens
- table primitive
- modal primitive
- button hierarchy
- icon-button style
- toast/state-message system

## 12. Backend Requirements Needed To Support This UI

The rough draft generator should know the UI is not just cosmetic. The backend must expose enough metadata to drive the same page in a non-hard-coded way.

### Provider registry must supply

- `provider_slug`
- `display_name`
- `docs_url`
- `env_var_name`
- `provider_category`
- `credential_form_kind`
- `enabled`
- `supported_auth_kinds`

### Credential list endpoints must supply

#### Organization page

- provider metadata above
- `credential_status`
- `last_updated_at`

#### Project page

- provider metadata above
- `credential_status`
- `effective_source`
- `has_local_override`
- `last_updated_at`

### Credential save/test payload model

Do not lock the backend to only:

- `{ api_key: string }`

Instead:

- save/test endpoints accept `credential_payload: object`
- the common provider form maps to:
  - `{ api_key: string }`
- future forms can map to richer payloads based on `credential_form_kind`

This is required so Azure/AWS/Vertex forms can reuse the same platform seam later.

## 13. Non-Basic Provider Rule

The PDF fully defines the common `basic_api_key` form only.

For Azure, AWS Bedrock, Vertex AI, and other non-basic providers:

- keep the same page layout
- keep the same grouped rows
- keep the same row-end configure action
- keep the same centered modal shell
- keep the same test/save/delete behavior
- change only the field constitution inside the modal according to `credential_form_kind`

## 14. Direct Build Prompt For A Text-Only Model

If another model needs a direct instruction block, use this:

> Build an AGChain provider-management page using our platform shell/tokens, not Braintrust's styling. The page is a flat settings surface with category-grouped provider rows (`Model providers`, `Cloud providers`). Each row has: provider icon, provider name, muted env-var subtitle, credential status, last update, and one trailing edit/configure icon button. Clicking the row action opens a narrow centered modal titled `Configure API key`. In the common provider form, show provider identity + docs link, a read-only `Name` field containing the env-var identifier, an `API key` secret input, helper encryption copy, a `Test key` secondary action, and a primary `Save` or `Update` action. Never show inline validation banners inside the modal. `Test key` keeps the modal open and emits a green/red toast outside the modal. `Save`/`Update` closes the modal on success, updates the row immediately, and always emits the same green success toast: `Secret saved successfully`, regardless of whether the key was tested, untested, or last failed validation.
