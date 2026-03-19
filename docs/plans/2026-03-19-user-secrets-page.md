# User Secrets Page

## Context

Users need a place to store API tokens for third-party services (Slack, GitHub, Stripe, etc.) that functions and workflows can reference by name at runtime. This is a simple name/value vault in the user Settings area, similar to Gumloop's Secrets page.

## Data Model

New table `user_secrets`. Plain text storage, RLS-protected (no server-side encryption). Client reads/writes directly through Supabase.

```sql
CREATE TABLE public.user_secrets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  value       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.user_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_secrets" ON public.user_secrets
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

## Navigation

New section in settings-nav.ts between GENERAL and OPERATIONS:

```
GENERAL
  Account
  Themes

SECRETS
  Secrets          → /app/settings/secrets

OPERATIONS
  AI Providers
  Model Roles
  Connections
  MCP Servers
  Admin
```

## UI

**Route:** `/app/settings/secrets`

**Page layout:**
- Header: "Secrets" / "Store API tokens and credentials for use in functions and workflows."
- Toolbar: search input + "Add Secret" button (top right)
- Table columns: Name, Value (masked ••••••••, eye icon to reveal), Description, Created, Actions (edit, delete)
- Empty state: "No secrets yet" with "Add Secret" button (like Gumloop)

**Add/Edit modal:**
- Name field (required, validated: uppercase + underscores convention)
- Value textarea (required)
- Description field (optional)
- Cancel + Save buttons

**Behavior:**
- Values show as •••••••• by default, eye icon toggles reveal
- Edit modal pre-fills name (read-only) and description, value field blank with "Enter new value" placeholder
- Delete with confirmation
- Search filters by name and description
- `updated_at` set on every upsert via trigger

## Runtime Access

Functions reference secrets via `{{secrets.SECRET_NAME}}`. The platform-api resolves these by querying `user_secrets` with the requesting user's context. Implementation of the runtime resolver is a separate task.

## Critical Files

- `supabase/migrations/` — new migration for `user_secrets` table + RLS
- `web/src/pages/settings/settings-nav.ts` — add SECRETS section
- `web/src/pages/settings/SecretsPage.tsx` — new page component
- `web/src/router.tsx` — add route
- `web/src/lib/tables.ts` — add table name constant
- `web/src/lib/types.ts` — add UserSecretRow type
