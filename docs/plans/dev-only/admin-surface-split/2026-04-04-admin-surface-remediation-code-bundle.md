# Admin Surface Remediation Code Bundle

- Date: 2026-04-04
- Scope: latest admin-surface remediation files only

## Included Files

- `supabase/functions/admin-config/index.ts`
- `supabase/functions/admin-config/index.test.ts`
- `web/src/hooks/useAdminSurfaceAccess.ts`
- `web/src/hooks/useAdminSurfaceAccess.test.tsx`
- `web/src/components/shell/ShellWorkspaceSelector.tsx`
- `web/src/components/shell/ShellWorkspaceSelector.test.tsx`
- `web/src/router.tsx`
- `web/src/router.admin-surfaces.test.ts`
- `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`

## `supabase/functions/admin-config/index.ts`

```ts
import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import {
  applyPolicyValue,
  buildRuntimePolicySnapshot,
  listAdminPolicyRows,
  loadRuntimePolicy,
  validateRuntimePolicy,
} from "../_shared/admin_policy.ts";
import { requireBlockdataAdmin } from "../_shared/superuser.ts";

type PolicyUpdate = {
  policy_key: string;
  value: unknown;
  reason?: string | null;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function mapAdminConfigErrorToResponse(error: unknown): Response {
  const msg = getErrorMessage(error);
  if (
    msg.includes("Missing Authorization header") ||
    msg.startsWith("Invalid auth")
  ) {
    return json(401, { error: msg });
  }
  if (
    msg.includes("Forbidden: blockdata admin access required") ||
    msg.includes("Forbidden: superuser access required")
  ) {
    return json(403, { error: msg });
  }
  if (
    msg.includes("Blockdata Admin access is not configured") ||
    msg.includes("Superuser access is not configured")
  ) {
    return json(503, { error: msg });
  }
  return json(500, { error: msg });
}

function parseAuditLimit(req: Request): number {
  const url = new URL(req.url);
  const raw = Number(url.searchParams.get("audit_limit") ?? "100");
  if (!Number.isFinite(raw)) return 100;
  return Math.min(Math.max(Math.floor(raw), 1), 500);
}

function parseUpdates(body: unknown): PolicyUpdate[] | null {
  if (
    body && typeof body === "object" &&
    Array.isArray((body as Record<string, unknown>).updates)
  ) {
    const updates = (body as { updates: unknown[] }).updates;
    const parsed: PolicyUpdate[] = [];
    for (const item of updates) {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const policyKey = typeof obj.policy_key === "string"
        ? obj.policy_key.trim()
        : "";
      if (!policyKey) return null;
      parsed.push({
        policy_key: policyKey,
        value: obj.value,
        reason: typeof obj.reason === "string" ? obj.reason.trim() : null,
      });
    }
    return parsed;
  }

  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    const policyKey = typeof obj.policy_key === "string"
      ? obj.policy_key.trim()
      : "";
    if (!policyKey) return null;
    return [{
      policy_key: policyKey,
      value: obj.value,
      reason: typeof obj.reason === "string" ? obj.reason.trim() : null,
    }];
  }

  return null;
}

function valueTypeMatches(value: unknown, valueType: string): boolean {
  if (valueType === "boolean") return typeof value === "boolean";
  if (valueType === "integer") {
    return typeof value === "number" && Number.isInteger(value) &&
      Number.isFinite(value);
  }
  if (valueType === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }
  if (valueType === "string") return typeof value === "string";
  if (valueType === "object") {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  if (valueType === "array") return Array.isArray(value);
  return false;
}

export async function adminConfigHandler(req: Request): Promise<Response> {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    const admin = await requireBlockdataAdmin(req);
    const supabaseAdmin = createAdminClient();

    if (req.method === "GET") {
      const auditLimit = parseAuditLimit(req);
      const policyRows = await listAdminPolicyRows(supabaseAdmin);
      const { data: auditRows, error: auditErr } = await supabaseAdmin
        .from("admin_runtime_policy_audit")
        .select(
          "audit_id, policy_key, old_value_jsonb, new_value_jsonb, changed_by, changed_at, reason",
        )
        .order("changed_at", { ascending: false })
        .limit(auditLimit);
      if (
        auditErr &&
        !auditErr.message.toLowerCase().includes("admin_runtime_policy_audit")
      ) {
        return json(500, {
          error: `Failed to load policy audit: ${auditErr.message}`,
        });
      }

      const runtimePolicy = await loadRuntimePolicy(supabaseAdmin);
      return json(200, {
        superuser: {
          user_id: admin.userId,
          email: admin.email,
        },
        policy_snapshot_preview: buildRuntimePolicySnapshot(
          runtimePolicy,
          new Date().toISOString(),
        ),
        policies: policyRows.map((row) => ({
          policy_key: row.policy_key,
          value: row.value_jsonb,
          value_type: row.value_type,
          description: row.description,
          updated_at: row.updated_at,
          updated_by: row.updated_by,
        })),
        audit: (auditRows ?? []).map((row: Record<string, unknown>) => ({
          audit_id: row.audit_id,
          policy_key: row.policy_key,
          old_value: row.old_value_jsonb,
          new_value: row.new_value_jsonb,
          changed_by: row.changed_by,
          changed_at: row.changed_at,
          reason: row.reason,
        })),
      });
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const body = await req.json().catch(() => null);
      const updates = parseUpdates(body);
      if (!updates || updates.length === 0) {
        return json(400, {
          error:
            "Invalid update payload. Provide policy_key/value or updates[]",
        });
      }

      const policyRows = await listAdminPolicyRows(supabaseAdmin);
      const rowByKey = new Map(policyRows.map((row) => [row.policy_key, row]));

      // Validate keys and value types first.
      for (const update of updates) {
        const row = rowByKey.get(update.policy_key);
        if (!row) {
          return json(400, {
            error: `Unknown policy key: ${update.policy_key}`,
          });
        }
        if (!valueTypeMatches(update.value, row.value_type)) {
          return json(400, {
            error:
              `Type mismatch for ${update.policy_key}: expected ${row.value_type}, got ${typeof update
                .value}`,
          });
        }
      }

      // Build candidate policy and validate cross-field constraints before writes.
      const candidatePolicy = await loadRuntimePolicy(supabaseAdmin);
      for (const update of updates) {
        const ok = applyPolicyValue(
          candidatePolicy,
          update.policy_key,
          update.value,
        );
        if (!ok) {
          return json(400, { error: `Invalid value for ${update.policy_key}` });
        }
      }
      const validationErrors = validateRuntimePolicy(candidatePolicy);
      if (validationErrors.length > 0) {
        return json(400, {
          error: "Policy validation failed",
          details: validationErrors,
        });
      }

      const applied: string[] = [];
      for (const update of updates) {
        const row = rowByKey.get(update.policy_key);
        if (!row) continue;
        const oldValue = row.value_jsonb;
        const newValue = update.value;

        if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
          continue;
        }

        const { error: updateErr } = await supabaseAdmin
          .from("admin_runtime_policy")
          .update({
            value_jsonb: newValue,
            updated_by: admin.userId,
          })
          .eq("policy_key", update.policy_key);
        if (updateErr) {
          return json(500, {
            error:
              `Failed to update ${update.policy_key}: ${updateErr.message}`,
          });
        }

        const { error: auditErr } = await supabaseAdmin
          .from("admin_runtime_policy_audit")
          .insert({
            policy_key: update.policy_key,
            old_value_jsonb: oldValue,
            new_value_jsonb: newValue,
            changed_by: admin.userId,
            reason: update.reason ?? null,
          });
        if (auditErr) {
          return json(500, {
            error:
              `Failed to write audit for ${update.policy_key}: ${auditErr.message}`,
          });
        }
        applied.push(update.policy_key);
      }

      const refreshedRows = await listAdminPolicyRows(supabaseAdmin);
      return json(200, {
        ok: true,
        applied_count: applied.length,
        applied_keys: applied,
        policies: refreshedRows.map((row) => ({
          policy_key: row.policy_key,
          value: row.value_jsonb,
          value_type: row.value_type,
          description: row.description,
          updated_at: row.updated_at,
          updated_by: row.updated_by,
        })),
      });
    }

    return json(405, { error: "Method not allowed" });
  } catch (e) {
    return mapAdminConfigErrorToResponse(e);
  }
}

if (import.meta.main) {
  Deno.serve(adminConfigHandler);
}
```

## `supabase/functions/admin-config/index.test.ts`

```ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapAdminConfigErrorToResponse } from "./index.ts";

Deno.test("mapAdminConfigErrorToResponse maps Blockdata Admin forbidden errors to 403", async () => {
  const response = mapAdminConfigErrorToResponse(
    new Error("Forbidden: blockdata admin access required"),
  );

  assertEquals(response.status, 403);
  assertEquals(await response.json(), {
    error: "Forbidden: blockdata admin access required",
  });
});

Deno.test("mapAdminConfigErrorToResponse maps Blockdata Admin configuration errors to 503", async () => {
  const response = mapAdminConfigErrorToResponse(
    new Error("Blockdata Admin access is not configured"),
  );

  assertEquals(response.status, 503);
  assertEquals(await response.json(), {
    error: "Blockdata Admin access is not configured",
  });
});
```

## `web/src/hooks/useAdminSurfaceAccess.ts`

```ts
import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { platformApiFetch } from '@/lib/platformApi';

export type AdminSurfaceAccess = {
  blockdataAdmin: boolean;
  agchainAdmin: boolean;
  superuser: boolean;
};

const AUTH_BYPASS_ENABLED = import.meta.env.VITE_AUTH_BYPASS === 'true';

const FULL_ACCESS: AdminSurfaceAccess = {
  blockdataAdmin: true,
  agchainAdmin: true,
  superuser: true,
};

type AccessResponse = {
  blockdata_admin?: boolean;
  agchain_admin?: boolean;
  superuser?: boolean;
};

export function useAdminSurfaceAccess(): AdminSurfaceAccess | null {
  const { loading, session, user } = useAuth();
  const userId = user?.id ?? null;
  const accessToken = session?.access_token ?? null;
  const [resolved, setResolved] = useState<{ userId: string | null; access: AdminSurfaceAccess | null }>({
    userId: AUTH_BYPASS_ENABLED ? '__auth_bypass__' : null,
    access: AUTH_BYPASS_ENABLED ? FULL_ACCESS : null,
  });

  useEffect(() => {
    if (AUTH_BYPASS_ENABLED) return;
    if (loading) return;
    if (!userId) return;

    let cancelled = false;

    platformApiFetch('/auth/access', { method: 'GET' })
      .then(async (resp) => {
        if (!resp.ok) {
          if (!cancelled) {
            setResolved((current) => (
              current.userId === userId ? current : { userId, access: null }
            ));
          }
          return;
        }

        const body = await resp.json() as AccessResponse;
        if (!cancelled) {
          setResolved({
            userId,
            access: {
              blockdataAdmin: Boolean(body.blockdata_admin),
              agchainAdmin: Boolean(body.agchain_admin),
              superuser: Boolean(body.superuser),
            },
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolved((current) => (
            current.userId === userId ? current : { userId, access: null }
          ));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, loading, userId]);

  if (AUTH_BYPASS_ENABLED) return FULL_ACCESS;
  if (loading) return null;
  if (!userId) return null;
  if (resolved.userId !== userId) return null;
  return resolved.access;
}
```

## `web/src/hooks/useAdminSurfaceAccess.test.tsx`

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAdminSurfaceAccess } from './useAdminSurfaceAccess';

const platformApiFetchMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

afterEach(() => {
  platformApiFetchMock.mockReset();
  useAuthMock.mockReset();
});

describe('useAdminSurfaceAccess', () => {
  it('waits for auth bootstrap before probing access', async () => {
    const authState = {
      loading: true,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    };
    useAuthMock.mockImplementation(() => authState);

    const { result, rerender } = renderHook(() => useAdminSurfaceAccess());

    expect(result.current).toBeNull();
    expect(platformApiFetchMock).not.toHaveBeenCalled();

    authState.loading = false;
    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: true,
        agchain_admin: false,
        superuser: true,
      }),
    });

    rerender();

    await waitFor(() => {
      expect(result.current).toEqual({
        blockdataAdmin: true,
        agchainAdmin: false,
        superuser: true,
      });
    });
  });

  it('retries when the auth token changes instead of collapsing to no access for the same user', async () => {
    let authState = {
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    };
    useAuthMock.mockImplementation(() => authState);

    platformApiFetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const { result, rerender } = renderHook(() => useAdminSurfaceAccess());

    expect(result.current).toBeNull();

    await waitFor(() => {
      expect(platformApiFetchMock).toHaveBeenCalledTimes(1);
    });
    expect(result.current).toBeNull();

    authState = {
      ...authState,
      session: { access_token: 'token-2' },
    };
    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: false,
        agchain_admin: true,
        superuser: false,
      }),
    });

    rerender();

    await waitFor(() => {
      expect(result.current).toEqual({
        blockdataAdmin: false,
        agchainAdmin: true,
        superuser: false,
      });
    });
  });
});
```

## `web/src/components/shell/ShellWorkspaceSelector.tsx`

```tsx
import { Combobox, createListCollection } from '@ark-ui/react/combobox';
import { IconChevronDown } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminSurfaceAccess } from '@/hooks/useAdminSurfaceAccess';

type WorkspaceValue = 'blockdata' | 'agchain' | 'blockdata-admin' | 'agchain-admin' | 'superuser';

type WorkspaceOption = {
  label: string;
  value: WorkspaceValue;
  path: string;
  adminKey?: 'blockdataAdmin' | 'agchainAdmin' | 'superuser';
};

const BASE_WORKSPACE_OPTIONS: WorkspaceOption[] = [
  { label: 'Blockdata', value: 'blockdata', path: '/app' },
  { label: 'AG chain', value: 'agchain', path: '/app/agchain' },
];

const ADMIN_WORKSPACE_OPTIONS: WorkspaceOption[] = [
  { label: 'Blockdata Admin', value: 'blockdata-admin', path: '/app/blockdata-admin', adminKey: 'blockdataAdmin' },
  { label: 'AGChain Admin', value: 'agchain-admin', path: '/app/agchain-admin', adminKey: 'agchainAdmin' },
  { label: 'Superuser', value: 'superuser', path: '/app/superuser', adminKey: 'superuser' },
];

const ADMIN_WORKSPACE_FALLBACKS: Record<Extract<WorkspaceValue, 'blockdata-admin' | 'agchain-admin' | 'superuser'>, Extract<WorkspaceValue, 'blockdata' | 'agchain'>> = {
  'blockdata-admin': 'blockdata',
  'agchain-admin': 'agchain',
  superuser: 'blockdata',
};

function isAdminWorkspaceValue(
  value: WorkspaceValue,
): value is Extract<WorkspaceValue, 'blockdata-admin' | 'agchain-admin' | 'superuser'> {
  return value in ADMIN_WORKSPACE_FALLBACKS;
}

export function ShellWorkspaceSelector() {
  const location = useLocation();
  const navigate = useNavigate();
  const access = useAdminSurfaceAccess();

  const currentValue: WorkspaceValue = location.pathname.startsWith('/app/blockdata-admin')
    ? 'blockdata-admin'
    : location.pathname.startsWith('/app/agchain-admin')
      ? 'agchain-admin'
      : location.pathname.startsWith('/app/superuser')
    ? 'superuser'
    : location.pathname.startsWith('/app/agchain')
      ? 'agchain'
      : 'blockdata';

  const workspaceOptions = useMemo(() => (
    [
      ...BASE_WORKSPACE_OPTIONS,
      ...ADMIN_WORKSPACE_OPTIONS.filter((option) => (
        access === null
          ? option.value === currentValue
          : (option.adminKey ? Boolean(access[option.adminKey]) : false)
      )),
    ]
  ), [access, currentValue]);

  const selectedValue = useMemo<WorkspaceValue>(() => {
    if (!isAdminWorkspaceValue(currentValue)) return currentValue;
    if (workspaceOptions.some((option) => option.value === currentValue)) {
      return currentValue;
    }
    return ADMIN_WORKSPACE_FALLBACKS[currentValue];
  }, [currentValue, workspaceOptions]);

  const workspaceCollection = useMemo(
    () => createListCollection({ items: workspaceOptions }),
    [workspaceOptions],
  );

  const currentOption = workspaceOptions.find((option) => option.value === selectedValue);

  return (
    <Combobox.Root
      collection={workspaceCollection}
      value={[selectedValue]}
      inputValue={currentOption?.label ?? ''}
      onValueChange={(details) => {
        const nextValue = details.value[0] as WorkspaceValue | undefined;
        const next = workspaceOptions.find((option) => option.value === nextValue);
        if (next && next.path !== location.pathname && next.value !== selectedValue) {
          navigate(next.path);
        }
      }}
      closeOnSelect
      openOnClick
      selectionBehavior="preserve"
      positioning={{ placement: 'bottom-end', sameWidth: true, offset: { mainAxis: 6 } }}
      className="shell-workspace-selector"
    >
      <Combobox.Control className="shell-workspace-selector-control">
        <Combobox.Input
          aria-label="Workspace"
          className="shell-workspace-selector-input"
          placeholder="Select workspace"
          readOnly
          spellCheck={false}
        />
        <Combobox.Trigger
          aria-label="Open workspace selector"
          className="shell-workspace-selector-trigger"
        >
          <IconChevronDown size={14} stroke={1.8} />
        </Combobox.Trigger>
      </Combobox.Control>
      <Combobox.Positioner className="shell-workspace-selector-positioner">
        <Combobox.Content className="shell-workspace-selector-content">
          {workspaceOptions.map((option) => (
            <Combobox.Item
              key={option.value}
              item={option}
              className="shell-workspace-selector-item"
            >
              <Combobox.ItemText>{option.label}</Combobox.ItemText>
            </Combobox.Item>
          ))}
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  );
}
```

## `web/src/components/shell/ShellWorkspaceSelector.test.tsx`

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ShellWorkspaceSelector } from './ShellWorkspaceSelector';

const navigateMock = vi.fn();
const useAdminSurfaceAccessMock = vi.fn<() => { blockdataAdmin: boolean; agchainAdmin: boolean; superuser: boolean } | null>(() => ({
  blockdataAdmin: false,
  agchainAdmin: false,
  superuser: false,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/hooks/useAdminSurfaceAccess', () => ({
  useAdminSurfaceAccess: () => useAdminSurfaceAccessMock(),
}));

beforeEach(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
  useAdminSurfaceAccessMock.mockReset();
  useAdminSurfaceAccessMock.mockReturnValue({
    blockdataAdmin: false,
    agchainAdmin: false,
    superuser: false,
  });
});

describe('ShellWorkspaceSelector', () => {
  it('shows Blockdata as the selected workspace on standard app routes', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveValue('Blockdata');
  });

  it('shows AG chain as the selected workspace on agchain routes', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/runs']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveValue('AG chain');
  });

  it('navigates to agchain when AG chain is selected', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /ag chain/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/agchain');
    });
  });

  it('navigates to blockdata when Blockdata is selected from agchain', async () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /blockdata/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app');
    });
  });

  it('hides the elevated admin surfaces when the probe is not authorized', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(screen.queryByRole('option', { name: /blockdata admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /agchain admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /superuser/i })).not.toBeInTheDocument();
  });

  it('shows the three elevated admin surfaces when the probe is authorized', async () => {
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: true,
      agchainAdmin: true,
      superuser: true,
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(await screen.findByRole('option', { name: /blockdata admin/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /agchain admin/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /superuser/i })).toBeInTheDocument();
  });

  it('shows only Blockdata Admin for a blockdata-only admin persona', async () => {
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: true,
      agchainAdmin: false,
      superuser: false,
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(await screen.findByRole('option', { name: /blockdata admin/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /agchain admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^superuser$/i })).not.toBeInTheDocument();
  });

  it('shows only AGChain Admin for an agchain-only admin persona', async () => {
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: false,
      agchainAdmin: true,
      superuser: false,
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(await screen.findByRole('option', { name: /agchain admin/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /blockdata admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^superuser$/i })).not.toBeInTheDocument();
  });

  it('shows only Superuser for a superuser-only persona', async () => {
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: false,
      agchainAdmin: false,
      superuser: true,
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(await screen.findByRole('option', { name: /^superuser$/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /blockdata admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /agchain admin/i })).not.toBeInTheDocument();
  });

  it('falls back to a visible workspace when the current admin route is forbidden', () => {
    render(
      <MemoryRouter initialEntries={['/app/blockdata-admin/instance-config']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveValue('Blockdata');

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(screen.queryByRole('option', { name: /blockdata admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /agchain admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^superuser$/i })).not.toBeInTheDocument();
  });

  it('navigates to the blockdata admin shell when Blockdata Admin is selected', async () => {
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: true,
      agchainAdmin: true,
      superuser: true,
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /blockdata admin/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/blockdata-admin');
    });
  });

  it('navigates to the agchain admin shell when AGChain Admin is selected', async () => {
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: true,
      agchainAdmin: true,
      superuser: true,
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /agchain admin/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/agchain-admin');
    });
  });

  it('navigates to the superuser shell when Superuser is selected', async () => {
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: true,
      agchainAdmin: true,
      superuser: true,
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /^superuser$/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/superuser');
    });
  });
});
```

## `web/src/router.tsx`

```tsx
/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PublicFullBleedLayout } from '@/components/layout/PublicFullBleedLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthGuard } from '@/auth/AuthGuard';


import MarketingIntegrations from '@/pages/MarketingIntegrations';
import AuthCallback from '@/pages/AuthCallback';
import AuthWelcome from '@/pages/AuthWelcome';
import LoginSplit from '@/pages/LoginSplit';
import Projects from '@/pages/Projects';
import FlowDetail from '@/pages/FlowDetail';
import FlowsList from '@/pages/FlowsList';

import Schemas from '@/pages/Schemas';
import SchemaLayout from '@/pages/SchemaLayout';

import { SettingsLayout, SettingsAccount, SettingsAiOverview, SettingsProviderForm, SettingsModelRoles, SettingsGridSample, SettingsSecrets, SettingsThemes } from '@/pages/settings';
import PlatformLanding from '@/pages/experiments/PlatformLanding';
import Landing from '@/pages/Landing';
import Agents from '@/pages/Agents';
import ModelRegistrationPreview from '@/pages/ModelRegistrationPreview';
import AgentOnboarding from '@/pages/AgentOnboarding';
import AgentOnboardingAuth from '@/pages/AgentOnboardingAuth';
import AgentOnboardingConnect from '@/pages/AgentOnboardingConnect';
import AgentOnboardingSelect from '@/pages/AgentOnboardingSelect';
import McpServers from '@/pages/settings/McpServers';
import ConnectionsPanel from '@/pages/settings/ConnectionsPanel';
import { ScalarApiPlaygroundPage } from '@/pages/settings/ScalarApiPlaygroundPage';
import Commands from '@/pages/Commands';

import DatabasePlaceholder from '@/pages/DatabasePlaceholder';
import ProjectAssetsPage from '@/pages/ProjectAssetsPage';
import ParsePage from '@/pages/ParsePage';
import PipelineServicesPage from '@/pages/PipelineServicesPage';
import IndexBuilderPage from '@/pages/IndexBuilderPage';
import { Component as Workspace } from '@/pages/Workspace';
import ExtractPage from '@/pages/ExtractPage';
import ConvertPage from '@/pages/ConvertPage';
import TransformPage from '@/pages/TransformPage';
import SecretsPage from '@/pages/SecretsPage';
import LoadPage from '@/pages/LoadPage';
import AppHome from '@/pages/AppHome';
import EarlyAccess from '@/pages/EarlyAccess';

import IntegrationsCatalog from '@/pages/marketplace/IntegrationsCatalog';
import ServicesCatalog from '@/pages/marketplace/ServicesCatalog';
import ServiceDetailPage from '@/pages/marketplace/ServiceDetailPage';
import FunctionCatalogPage from '@/pages/marketplace/FunctionCatalogPage';
import LogsPage from '@/pages/kestra/LogsPage';
import TestsPage from '@/pages/kestra/TestsPage';
import { FlowsShellLayout } from '@/components/layout/FlowsShellLayout';
import { featureFlags } from '@/lib/featureFlags';
import { BlockdataAdminGuard, AgchainAdminGuard, SuperuserGuard } from '@/pages/superuser/SuperuserGuard';
import NotFound from '@/pages/NotFound';
import { AdminShellLayout } from '@/components/layout/AdminShellLayout';
import { AgchainShellLayout } from '@/components/layout/AgchainShellLayout';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';


function LegacyToTransform() {
  useParams<{ projectId: string }>();
  return <Navigate to="/app/transform" replace />;
}


function LegacySettingsAdminRedirect() {
  const { category } = useParams<{ category?: string }>();
  const targetByCategory: Record<string, string> = {
    'instance-config': '/app/blockdata-admin/instance-config',
    'worker-config': '/app/blockdata-admin/worker-config',
    audit: '/app/blockdata-admin/audit',
    'parsers-docling': '/app/blockdata-admin/parsers-docling',
    'platform-config': '/app/blockdata-admin/instance-config',
  };

  return <Navigate to={targetByCategory[category ?? ''] ?? '/app/blockdata-admin/instance-config'} replace />;
}

function LegacyPipelineServicesRedirect() {
  const { serviceSlug } = useParams<{ serviceSlug?: string }>();
  const target = serviceSlug
    ? `/app/pipeline-services/${encodeURIComponent(serviceSlug)}`
    : '/app/pipeline-services';
  return <Navigate to={target} replace />;
}

function UnsupportedPipelineServiceRedirect() {
  return <Navigate to="/app/pipeline-services" replace />;
}

function AgchainIndexRedirect() {
  const { focusedProject, status } = useAgchainProjectFocus();

  if (status === 'bootstrapping') {
    return (
      <div className="flex min-h-full items-center justify-center bg-background px-6 py-12 text-sm text-muted-foreground">
        Loading AGChain project context...
      </div>
    );
  }

  if (status === 'ready' && focusedProject) {
    return <Navigate to="/app/agchain/overview" replace />;
  }

  // no-organization, no-project, and error all land on the projects registry surface
  return <Navigate to="/app/agchain/projects" replace />;
}

function agchainSettingsPlaceholderRoute(spec: {
  scope: 'organization' | 'project' | 'personal';
  title: string;
  description: string;
  note: string;
}) {
  return async () => {
    const { AgchainSettingsPlaceholderPage } = await import('@/components/agchain/settings/AgchainSettingsPlaceholderPage');
    const Component = () => <AgchainSettingsPlaceholderPage {...spec} />;
    return { Component };
  };
}

export const router = createBrowserRouter([
  // Marketing pages: full-width with PublicNav
  {
    element: <MarketingLayout />,
    children: [
      { path: '/integrations', element: <MarketingIntegrations /> },
      { path: '/experiments/platform', element: <PlatformLanding /> },
    ],
  },
  // Landing: marketing layout with nav + footer
  {
    element: <MarketingLayout />,
    children: [
      { path: '/', element: <Landing /> },
    ],
  },
  // Auth pages: full-bleed (use the split concepts)
  {
    element: <PublicFullBleedLayout />,
    children: [
      { path: '/login', element: <LoginSplit /> },
      { path: '/register', element: <Navigate to="/early-access" replace /> },
      { path: '/early-access', element: <EarlyAccess /> },
    ],
  },
  // Auth callback: PublicNav + centered content
  {
    element: <PublicLayout />,
    children: [
      { path: '/auth/callback', element: <AuthCallback /> },
      { path: '/auth/welcome', element: <AuthWelcome /> },
    ],
  },

  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // App landing + projects
          { path: '/app', element: <AppHome /> },

          { path: '/app/projects/list', element: <Projects /> },
          { path: '/app/database', element: <DatabasePlaceholder /> },
          { path: '/app/assets', element: <ProjectAssetsPage /> },
          { path: '/app/parse', element: <ParsePage /> },
          { path: '/app/pipeline-services', element: <PipelineServicesPage /> },
          { path: '/app/pipeline-services/index-builder', element: <IndexBuilderPage /> },
          { path: '/app/pipeline-services/knowledge-bases', lazy: () => import('@/pages/KnowledgeBases') },
          { path: '/app/pipeline-services/:serviceSlug', element: <UnsupportedPipelineServiceRedirect /> },
          { path: '/app/rag', element: <LegacyPipelineServicesRedirect /> },
          { path: '/app/rag/:serviceSlug', element: <LegacyPipelineServicesRedirect /> },
          { path: '/app/knowledge-bases', element: <Navigate to="/app/pipeline-services/knowledge-bases" replace /> },
          { path: '/app/workspace', element: <Workspace /> },
          { path: '/app/extract', element: <ExtractPage /> },
          { path: '/app/convert', element: <ConvertPage /> },
          { path: '/app/secrets', element: <SecretsPage /> },
          { path: '/app/tests', element: <TestsPage /> },
          { path: '/app/logs', element: <LogsPage /> },
          { path: '/app/test-integrations', element: <Navigate to="/app/blockdata-admin/test-integrations" replace /> },
          { path: '/app/marketplace/integrations', element: <IntegrationsCatalog /> },
          { path: '/app/marketplace/services', element: <ServicesCatalog /> },
          { path: '/app/marketplace/services/:serviceId', element: <ServiceDetailPage /> },
          { path: '/app/marketplace/functions', element: <FunctionCatalogPage /> },
          { path: '/app/flows', element: <FlowsList /> },

          { path: '/app/ui', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/ui/:section', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/transform', element: <TransformPage /> },
          { path: '/app/transform/:projectId', element: <LegacyToTransform /> },

          // Global schemas (not project-scoped)
          { path: '/app/schemas', element: <Schemas /> },
          { path: '/app/schemas/layout', element: <SchemaLayout /> },
          { path: '/app/schemas/start', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/wizard', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/templates', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/templates/:templateId', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/apply', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/advanced', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/advanced/:schemaId', element: <Navigate to="/app/schemas" replace /> },
          // API Editor (Scalar playground)
          { path: '/app/api-editor', element: <ScalarApiPlaygroundPage /> },

          // Load (GCS â†’ ArangoDB wizard)
          { path: '/app/load', element: <LoadPage /> },

          // Pipeline nav pages
          { path: '/app/skills', lazy: () => import('@/pages/Skills') },
          { path: '/app/mcp-tools', lazy: () => import('@/pages/McpTools') },
          { path: '/app/observability', element: <Navigate to="/app/observability/telemetry" replace /> },
          { path: '/app/observability/telemetry', lazy: () => import('@/pages/ObservabilityTelemetry') },
          { path: '/app/observability/traces', lazy: () => import('@/pages/ObservabilityTraces') },

          // Settings (API keys, model defaults, MCP)
          {
            path: '/app/settings',
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="/app/settings/profile" replace /> },
              { path: 'profile', element: <SettingsAccount /> },
              { path: 'themes', element: <SettingsThemes /> },
              { path: 'secrets', element: <SettingsSecrets /> },
              { path: 'ai', element: <Navigate to="/app/blockdata-admin/ai-providers" replace /> },
              { path: 'ai/:providerId', element: <Navigate to="/app/blockdata-admin/ai-providers" replace /> },
              { path: 'model-roles', element: <Navigate to="/app/blockdata-admin/model-roles" replace /> },
              { path: 'mcp', element: <Navigate to="/app/blockdata-admin/mcp" replace /> },
              { path: 'connections', element: <Navigate to="/app/blockdata-admin/connections" replace /> },
              { path: 'grid-sample', element: <SettingsGridSample /> },
              { path: 'admin', element: <Navigate to="/app/blockdata-admin/instance-config" replace /> },
              { path: 'admin/:category', element: <LegacySettingsAdminRedirect /> },
            ],
          },

          // Agents + MCP (config surfaces; execution deferred)
          {
            path: '/app/agents',
            element: featureFlags.agentsConfigUI ? <Agents /> : <Navigate to="/app/settings" replace />,
          },
          {
            path: '/app/agents/preview',
            element: <ModelRegistrationPreview />,
          },
          {
            path: '/app/onboarding/agents',
            element: featureFlags.agentsConfigUI ? <AgentOnboarding /> : <Navigate to="/app/settings" replace />,
          },
          {
            path: '/app/onboarding/agents/select',
            element: featureFlags.agentsConfigUI ? <AgentOnboardingSelect /> : <Navigate to="/app/settings" replace />,
          },
          {
            path: '/app/onboarding/agents/auth/:agentSlug',
            element: featureFlags.agentsConfigUI ? <AgentOnboardingAuth /> : <Navigate to="/app/settings" replace />,
          },
          {
            path: '/app/onboarding/agents/connect/:agentSlug/:authMethod',
            element: featureFlags.agentsConfigUI ? <AgentOnboardingConnect /> : <Navigate to="/app/settings" replace />,
          },
          // /app/mcp removed â€” MCP now lives at /app/blockdata-admin/mcp
          { path: '/app/mcp', element: <Navigate to="/app/blockdata-admin/mcp" replace /> },
          {
            path: '/app/commands',
            element: featureFlags.commandsUI ? <Commands /> : <Navigate to="/app/settings" replace />,
          },

          { path: '*', element: <NotFound /> },
        ],
      },
      // Admin shell â€” separate from AppLayout, no inherited header/rail
      {
        element: <FlowsShellLayout />,
        children: [
          {
            path: '/app/flows/:namespace/:flowId/:tab?',
            element: <FlowDetail />,
          },
        ],
      },
      {
        path: '/app/superuser/parsers-docling',
        element: <Navigate to="/app/blockdata-admin/parsers-docling" replace />,
      },
      {
        path: '/app/superuser/instance-config',
        element: <Navigate to="/app/blockdata-admin/instance-config" replace />,
      },
      {
        path: '/app/superuser/worker-config',
        element: <Navigate to="/app/blockdata-admin/worker-config" replace />,
      },
      {
        path: '/app/superuser/audit',
        element: <Navigate to="/app/blockdata-admin/audit" replace />,
      },
      {
        path: '/app/superuser/api-endpoints',
        element: <Navigate to="/app/blockdata-admin/api-endpoints" replace />,
      },
      {
        path: '/app/superuser/test-integrations',
        element: <Navigate to="/app/blockdata-admin/test-integrations" replace />,
      },
      {
        path: '/app/superuser/ai-providers',
        element: <Navigate to="/app/blockdata-admin/ai-providers" replace />,
      },
      {
        path: '/app/superuser/ai-providers/:providerId',
        element: <Navigate to="/app/blockdata-admin/ai-providers" replace />,
      },
      {
        path: '/app/superuser/model-roles',
        element: <Navigate to="/app/blockdata-admin/model-roles" replace />,
      },
      {
        path: '/app/superuser/connections',
        element: <Navigate to="/app/blockdata-admin/connections" replace />,
      },
      {
        path: '/app/superuser/mcp',
        element: <Navigate to="/app/blockdata-admin/mcp" replace />,
      },
      {
        path: '/app/blockdata-admin',
        element: <BlockdataAdminGuard />,
        children: [
          {
            element: <AdminShellLayout />,
            children: [
              { index: true, lazy: () => import('@/pages/superuser/SuperuserWorkspace') },
              { path: 'parsers-docling', lazy: () => import('@/pages/settings/DoclingConfigPanel') },
              { path: 'instance-config', lazy: () => import('@/pages/superuser/SuperuserInstanceConfig') },
              { path: 'worker-config', lazy: () => import('@/pages/superuser/SuperuserWorkerConfig') },
              { path: 'audit', lazy: () => import('@/pages/superuser/SuperuserAuditHistory') },
              { path: 'api-endpoints', lazy: () => import('@/pages/superuser/SuperuserApiEndpoints') },
              { path: 'test-integrations', lazy: () => import('@/pages/superuser/TestIntegrations') },
              { path: 'ai-providers', element: <SettingsAiOverview /> },
              { path: 'ai-providers/:providerId', element: <SettingsProviderForm /> },
              { path: 'model-roles', element: <SettingsModelRoles /> },
              { path: 'connections', element: <ConnectionsPanel /> },
              { path: 'mcp', element: <McpServers /> },
            ],
          },
        ],
      },
      {
        path: '/app/agchain-admin',
        element: <AgchainAdminGuard />,
        children: [
          {
            element: <AdminShellLayout />,
            children: [
              { index: true, element: <Navigate to="/app/agchain-admin/models" replace /> },
              {
                path: 'models',
                lazy: async () => ({ Component: (await import('@/pages/admin/AgchainAdminModelsPage')).default }),
              },
            ],
          },
        ],
      },
      {
        path: '/app/superuser',
        element: <SuperuserGuard />,
        children: [
          {
            element: <AdminShellLayout />,
            children: [
              { index: true, element: <Navigate to="/app/superuser/operational-readiness" replace /> },
              { path: 'operational-readiness', lazy: () => import('@/pages/superuser/SuperuserOperationalReadiness') },
              { path: 'design-layout-captures', lazy: () => import('@/pages/superuser/DesignLayoutCaptures') },
              { path: 'plan-tracker', lazy: () => import('@/pages/superuser/PlanTracker') },
            ],
          },
        ],
      },
      {
        element: <AgchainShellLayout />,
        children: [
          {
            path: '/app/agchain',
            children: [
              {
                index: true,
                element: <AgchainIndexRedirect />,
              },
              {
                path: 'overview',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainOverviewPage')).default }),
              },
              {
                path: 'projects',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainProjectsPage')).default }),
              },
              {
                path: 'datasets',
                children: [
                  {
                    index: true,
                    lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainDatasetsPage')).default }),
                  },
                  {
                    path: 'new',
                    lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainDatasetCreatePage')).default }),
                  },
                  {
                    path: ':datasetId',
                    lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainDatasetDetailPage')).default }),
                  },
                  {
                    path: ':datasetId/versions/new/:draftId',
                    lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainDatasetVersionDraftPage')).default }),
                  },
                ],
              },
              {
                path: 'prompts',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainPromptsPage')).default }),
              },
              {
                path: 'scorers',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainScorersPage')).default }),
              },
              {
                path: 'parameters',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainParametersPage')).default }),
              },
              {
                path: 'tools',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainToolsPage')).default }),
              },
              {
                path: 'benchmarks',
                element: <Navigate to="/app/agchain/settings/project/benchmark-definition" replace />,
              },
              {
                path: 'benchmarks/:benchmarkId',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainBenchmarkWorkbenchPage')).default }),
              },
              {
                path: 'models',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainModelsPage')).default }),
              },
              {
                path: 'runs',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainRunsPage')).default }),
              },
              {
                path: 'results',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainResultsPage')).default }),
              },
              {
                path: 'observability',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainObservabilityPage')).default }),
              },
              {
                path: 'settings',
                children: [
                  {
                    index: true,
                    lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainSettingsPage')).default }),
                  },
                  {
                    path: 'organization/members',
                    lazy: async () => ({ Component: (await import('@/pages/agchain/settings/AgchainOrganizationMembersPage')).default }),
                  },
                  {
                    path: 'organization/permission-groups',
                    lazy: async () => ({ Component: (await import('@/pages/agchain/settings/AgchainPermissionGroupsPage')).default }),
                  },
                  {
                    path: 'organization/api-keys',
                    lazy: agchainSettingsPlaceholderRoute({
                      scope: 'organization',
                      title: 'Organization API Keys',
                      description: 'Organization-owned API credentials and shared issuance policies will live here.',
                      note: 'This scoped settings page is visible now so the settings information architecture stays stable as organization-owned credentials arrive.',
                    }),
                  },
                  {
                    path: 'organization/ai-providers',
                    lazy: agchainSettingsPlaceholderRoute({
                      scope: 'organization',
                      title: 'Organization AI Providers',
                      description: 'Shared provider defaults and organization-owned model access policies will live here.',
                      note: 'This section remains visible so future organization-level provider controls do not require reshaping the AGChain settings shell.',
                    }),
                  },
                  {
                    path: 'project/general',
                    lazy: agchainSettingsPlaceholderRoute({
                      scope: 'project',
                      title: 'Project General',
                      description: 'Project-level identity, defaults, and descriptive metadata will converge here.',
                      note: 'Benchmark definition remains the live project-level settings child page in this implementation wave.',
                    }),
                  },
                  {
                    path: 'project/members',
                    lazy: agchainSettingsPlaceholderRoute({
                      scope: 'project',
                      title: 'Project Members',
                      description: 'Project-specific membership overlays and participation controls will live here.',
                      note: 'This page is visible now to lock the project settings taxonomy before project-level access overlays are implemented.',
                    }),
                  },
                  {
                    path: 'project/access',
                    lazy: agchainSettingsPlaceholderRoute({
                      scope: 'project',
                      title: 'Project Access',
                      description: 'Project-specific access rules, sharing posture, and exceptions will live here.',
                      note: 'Organization-level permission groups land first. Project-specific access controls remain a later batch.',
                    }),
                  },
                  {
                    path: 'project/benchmark-definition',
                    lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainBenchmarksPage')).default }),
                  },
                  {
                    path: 'personal/preferences',
                    lazy: agchainSettingsPlaceholderRoute({
                      scope: 'personal',
                      title: 'Personal Preferences',
                      description: 'AGChain-specific user defaults, shortcuts, and local preferences will live here.',
                      note: 'This page stays visible so user-scoped controls do not get absorbed into organization or project settings.',
                    }),
                  },
                  {
                    path: 'personal/credentials',
                    lazy: agchainSettingsPlaceholderRoute({
                      scope: 'personal',
                      title: 'Personal Credentials',
                      description: 'User-owned AGChain credentials and per-user provider overrides will live here.',
                      note: 'Global account settings remain outside AGChain. This surface is reserved for AGChain-specific personal credentials only.',
                    }),
                  },
                ],
              },
              // Removed routes â€” redirect to nearest equivalent
              { path: 'build',     element: <Navigate to="/app/agchain/settings/project/benchmark-definition" replace /> },
              { path: 'artifacts', element: <Navigate to="/app/agchain/observability" replace /> },
            ],
          },
        ],
      },
    ],
  },
  // Catch-all 404 for routes outside /app
  { path: '*', element: <NotFound /> },
]);


```

## `web/src/router.admin-surfaces.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest';
import { AdminShellLayout } from '@/components/layout/AdminShellLayout';
import { router } from '@/router';
import { AgchainAdminGuard, BlockdataAdminGuard, SuperuserGuard } from '@/pages/superuser/SuperuserGuard';

vi.mock('react-pdf-highlighter', () => ({
  AreaHighlight: () => null,
  Highlight: () => null,
  PdfHighlighter: () => null,
  PdfLoader: () => null,
  Popup: () => null,
}));

vi.mock('react-pdf-highlighter/dist/style.css', () => ({}));

type RouteNode = {
  path?: string;
  children?: RouteNode[];
  element?: unknown;
};

function getElementType(route: RouteNode): unknown {
  if (!route.element || typeof route.element !== 'object' || !('type' in route.element)) {
    return null;
  }
  return (route.element as { type?: unknown }).type ?? null;
}

function findRouteChain(routes: RouteNode[], targetPath: string, ancestors: RouteNode[] = []): RouteNode[] | null {
  for (const route of routes) {
    const chain = [...ancestors, route];
    if (route.path === targetPath) {
      return chain;
    }
    if (route.children) {
      const match = findRouteChain(route.children, targetPath, chain);
      if (match) return match;
    }
  }
  return null;
}

function expectGuardOutsideAdminShell(path: string, expectedGuard: unknown) {
  const chain = findRouteChain(router.routes as RouteNode[], path);
  expect(chain, `expected to find route ${path}`).not.toBeNull();
  const resolvedChain = chain!;

  expect(getElementType(resolvedChain.at(-1)!)).toBe(expectedGuard);
  expect(resolvedChain.slice(0, -1).map(getElementType)).not.toContain(AdminShellLayout);
}

describe('admin surface route ancestry', () => {
  it('keeps Blockdata Admin guarded before the admin shell mounts', () => {
    expectGuardOutsideAdminShell('/app/blockdata-admin', BlockdataAdminGuard);
  });

  it('keeps AGChain Admin guarded before the admin shell mounts', () => {
    expectGuardOutsideAdminShell('/app/agchain-admin', AgchainAdminGuard);
  });

  it('keeps Superuser guarded before the admin shell mounts', () => {
    expectGuardOutsideAdminShell('/app/superuser', SuperuserGuard);
  });
});
```

## `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { AdminShellLayout } from '../AdminShellLayout';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'jon@example.com' },
    profile: null,
    signOut: vi.fn(),
  }),
}));

vi.mock('@/components/shell/LeftRailShadcn', () => ({
  LeftRailShadcn: () => <div data-testid="mock-platform-rail-content">platform rail</div>,
}));

afterEach(cleanup);

function renderWithRouter(path = '/app/superuser') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/superuser/*" element={<AdminShellLayout />}>
          <Route index element={<div data-testid="outlet-child">outlet</div>} />
          <Route path="*" element={<div data-testid="outlet-child">outlet</div>} />
        </Route>
        <Route path="/app/blockdata-admin/*" element={<AdminShellLayout />}>
          <Route index element={<div data-testid="outlet-child">outlet</div>} />
          <Route path="*" element={<div data-testid="outlet-child">outlet</div>} />
        </Route>
        <Route path="/app/agchain-admin/*" element={<AdminShellLayout />}>
          <Route index element={<div data-testid="outlet-child">outlet</div>} />
          <Route path="*" element={<div data-testid="outlet-child">outlet</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminShellLayout', () => {
  it('renders the platform rail and main area on the index route', () => {
    renderWithRouter();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('admin-platform-rail')).toBeInTheDocument();
  });

  it('does not render the secondary rail on routes without secondary nav', () => {
    renderWithRouter('/app/superuser/operational-readiness');
    expect(screen.queryByTestId('admin-secondary-rail')).not.toBeInTheDocument();
  });

  it('renders the secondary rail on routes with secondary nav', () => {
    renderWithRouter('/app/blockdata-admin/instance-config');
    expect(screen.getByTestId('admin-secondary-rail')).toBeInTheDocument();
  });

  it('renders the outlet inside the admin workspace frame', () => {
    renderWithRouter();
    expect(screen.getByTestId('admin-shell-frame')).toBeInTheDocument();
  });

  it('renders the outlet child', () => {
    renderWithRouter();
    expect(screen.getByTestId('outlet-child')).toBeInTheDocument();
  });
});
```

