# AGChain Credential Popup Replication — PDF-First UI/Backend Mapping

**Input asset:** `P:\agchain models- doc 1.pdf`

## Source Fidelity Notes

The PDF text extraction is limited to 16 lines, but the captured text is internally consistent and useful enough to lock the credential-flow behavior contract.

- `Basic Form`
- `Will provide credential forms for access token or service account key as required by vertex ai, azure, aws by provider separately.`
- `Grok - Basic “Set API key”`
- `-- 1 of 3 --`
- `Saving the Key`
- `-- 2 of 3 --`
- `The same state message is used regardless of whether the api key passed test or not.`
- `-- 3 of 3 --`

I could not extract pixel-level image assets in this environment, so the report below preserves behavior and wording over exact pixel metrics. If you want strict pixel parity, provide either:

1. Source images (PNG/JPG per page) extracted from the PDF, or
2. Direct browser capture of the target page.

## What must be preserved (behavior-first, not cosmetic-only)

### 1) Provider-specific credential form generation

- The popup is not a single static field; provider type determines whether the form asks for:
  - access token, or
  - service account key style input.
- `vertex ai`, `azure`, and `aws` are explicitly called out as provider families with provider-specific form variants.

### 2) Three-step visual workflow

- The sequence is explicitly 3-step (`1 of 3`, `2 of 3`, `3 of 3`) and should be represented with deterministic step state.
- The visible step labels should lock these transitions:
  - Step 1: form entry and context text
  - Step 2: in-flight state with copy `Saving the Key`
  - Step 3: post-attempt completion state

### 3) State messaging rule (important)

- The doc states the state message must remain the same regardless of validation pass/fail.
- This implies:
  - keep the modal status text stable (`messageKey` constant),
  - show pass/fail only through a small status chip/badge or icon if required,
  - avoid rewriting the headline/copy into success vs failure variants.

### 4) Provider identity and copy

- Header copy from sample:
  - `Grok - Basic “Set API key”`
- It is safer to keep this as a composed string: `[provider] - Basic “Set API key”`.
- Use exact capitalization and punctuation where possible to preserve copy parity.

## Backend Mapping (UI-driven contract)

### Data model for popup rendering

For each provider, backend should return a schema payload that lets frontend build the right credential form:

```json
{
  "provider_slug": "grok",
  "provider_name": "Grok",
  "credential_mode": "access_token" | "service_account_key",
  "docs_url": "https://...",
  "env_var_name": "GROK_API_KEY",
  "fields": [
    {
      "field_key": "api_key",
      "label": "API Key",
      "input_type": "password",
      "placeholder": "***",
      "required": true,
      "helper_copy": "Store as project/organization credential depending on screen."
    }
  ]
}
```

### Endpoints and behavior to support the replicated flow

1. `GET /providers/{provider_slug}/credential-form`
   - Returns form schema and provider metadata.
2. `POST /providers/{provider_slug}/credential/test`
   - Inputs key payload.
   - Returns `test_result: passed | failed`.
   - Response object may include `latency_ms`, `details`, but keep popup headline message fixed.
3. `PUT /providers/{scope}/{scope_id}/provider-credential`
   - Stores credential, updates `key_suffix_present`, `updated_at`, `validation_status`.
   - Returns canonical row status only; avoid exposing full secret material.
4. `DELETE ...` is optional and should preserve this UI contract by returning a clear state revert.

### Security and compatibility constraints

- Never echo secret text back to client after save/test.
- Return only masked/safe representations (`suffix`, `has_value`, `updated_at`, `validation_status`).
- Keep test endpoint side-effect free from stored credential perspective.
- Preserve organization/project scoping rules from your current AGChain credential model.

## Popup behavior matrix (strict)

| State | Visual condition | Allowed actions | Messaging |
|---|---|---|---|
| Entry | No key persisted | `Test key`, `Save`, `Cancel` | Step label `1 of 3` |
| Test/Save in-flight | User triggered `Test` or `Save` | Disable all key actions | Step label `2 of 3`, copy `Saving the Key` |
| Completion | Test/Save done | `Close`, optional `Edit again` | Step label `3 of 3`, stable message |
| Test failed | Key invalid | Same stable completion message with status chip `failed` | no copy rewrite |
| Test passed | Key valid | Same stable completion message with status chip `passed` | no copy rewrite |

## Suggested implementation approach (no repo mutation)

- Keep UI shell and design tokens from platform.
- Use a provider-agnostic credential modal component.
- Drive everything from backend schema to keep “same behavior, provider-specific fields” guarantees.
- Keep endpoint contracts narrow, typed, and stable (especially around the fixed copy rule).

## Files saved by this analysis (for code review handoff)

- `docs/analysis/agchain-provider-credential-popup-mock.tsx`  
  - Mock popup implementation with stepper + fixed-status-message behavior.
- `docs/analysis/2026-04-06-agchain-model-page-popup-replication-analysis.md`  
  - This report, intended to be consumed before implementation.
