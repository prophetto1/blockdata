# Plan: Multi-Provider Settings — End to End

## Current State (what's already done)

| Layer | Status | Notes |
|---|---|---|
| **Settings.tsx** (frontend) | DONE | Two-column layout, all 4 providers enabled, base_url for Custom |
| **`test-api-key` edge fn** | DONE | Tests Anthropic, OpenAI, Google, Custom endpoints |
| **`user-api-keys` edge fn** | DONE | CRUD for all 4 providers + base_url |
| **DB: `base_url` column** | DONE (live) | Exists in prod but NO migration file |
| **DB: RPCs with `p_base_url`** | DONE (live) | Exists in prod but NO migration file |
| **`worker` edge fn** | ANTHROPIC ONLY | Hardcoded Anthropic API URL, headers, tool_use format |

## What needs to be done

### Step 1: Catch-up migration file

Write a migration that adds `base_url` column and updates the 3 RPCs
(`save_api_key`, `update_api_key_defaults`, `delete_api_key`) to include
`p_base_url`. This records what's already live so future environments
match.

**File:** `supabase/migrations/YYYYMMDD_add_base_url_to_user_api_keys.sql`

Changes:
- `ALTER TABLE public.user_api_keys ADD COLUMN IF NOT EXISTS base_url TEXT DEFAULT NULL;`
- `GRANT SELECT (base_url) ON TABLE public.user_api_keys TO authenticated;`
- `CREATE OR REPLACE FUNCTION public.save_api_key(...)` — add `p_base_url TEXT DEFAULT NULL`
- `CREATE OR REPLACE FUNCTION public.update_api_key_defaults(...)` — add `p_base_url TEXT DEFAULT NULL`
- Re-grant EXECUTE with updated signatures
- Revoke old signatures

### Step 2: Multi-provider worker

Refactor `supabase/functions/worker/index.ts` to dispatch LLM calls based on
the provider whose key is stored for the run's owner.

**New file:** `supabase/functions/_shared/llm.ts` — provider-agnostic LLM dispatcher

Each provider uses a different API shape for structured output:

| Provider | Endpoint | Auth | Structured output mechanism |
|---|---|---|---|
| **Anthropic** | `api.anthropic.com/v1/messages` | `x-api-key` header | `tools` + `tool_choice` |
| **OpenAI** | `api.openai.com/v1/chat/completions` | `Bearer` token | `tools` + `tool_choice` (function calling) |
| **Google AI** | `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | `key=` query param | `functionDeclarations` + `toolConfig` |
| **Custom** | `{base_url}/chat/completions` | `Bearer` token | Same as OpenAI (OpenAI-compatible) |

The dispatcher:
```ts
type LLMConfig = {
  provider: "anthropic" | "openai" | "google" | "custom";
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
};

async function callLLM(
  config: LLMConfig,
  systemPrompt: string,
  userMessage: string,
  schemaProperties: Record<string, unknown>,
): Promise<Record<string, unknown>>
```

Each provider implementation:
- **`callAnthropic()`** — existing code, extracted
- **`callOpenAI()`** — OpenAI function calling format
- **`callGoogle()`** — Gemini function declarations format
- **`callCustom()`** — OpenAI-compatible, uses `base_url`

### Step 3: Update worker to resolve provider

Currently the worker queries `user_api_keys WHERE provider = 'anthropic'`.

Change to:
1. Query ALL keys for the user: `SELECT * FROM user_api_keys WHERE user_id = ?`
2. Determine which provider to use. Priority:
   - `run.model_config.provider` (if set on the run)
   - `schema.prompt_config.provider` (if set in the schema)
   - First valid key found (ordered by: anthropic > openai > google > custom)
3. Decrypt the selected key, resolve the model name, and call the dispatcher

### Step 4: Deploy edge functions

Deploy all three updated edge functions:
- `test-api-key` (already correct in repo, just needs deploy)
- `user-api-keys` (already correct in repo, just needs deploy)
- `worker` (after refactor)

### Step 5: Verify end-to-end

Test with an Anthropic key (existing flow should still work identically).

---

## Files touched

| File | Action |
|---|---|
| `supabase/migrations/YYYYMMDD_add_base_url_to_user_api_keys.sql` | NEW — catch-up migration |
| `supabase/functions/_shared/llm.ts` | NEW — multi-provider LLM dispatcher |
| `supabase/functions/worker/index.ts` | EDIT — use dispatcher instead of hardcoded Anthropic |
| `supabase/functions/test-api-key/index.ts` | NO CHANGE (already done) |
| `supabase/functions/user-api-keys/index.ts` | NO CHANGE (already done) |
| `web/src/pages/Settings.tsx` | NO CHANGE (already done) |

## Risks

- **Google AI function calling** has a different response shape than OpenAI/Anthropic. Need to normalize the extracted fields from `functionCall.args` vs `tool_use.input` vs `tool_calls[0].function.arguments`.
- **Custom endpoints** may not support function calling. Fallback: use `response_format: { type: "json_schema" }` for OpenAI-compatible endpoints, or plain prompt + JSON extraction as last resort.
- **Model name validation** — user could pick an Anthropic model but have only an OpenAI key. The worker should error clearly: "Model X requires provider Y, but no key is configured for Y."
