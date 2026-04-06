import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { platformApiFetch } from '@/lib/platformApi';
import { SettingsPageFrame, SettingsSection } from './SettingsPageHeader';
import { cn } from '@/lib/utils';

type Connection = {
  id: string;
  provider: string;
  connection_type: string;
  status: string;
  metadata_jsonb: Record<string, unknown> | null;
  updated_at: string;
};

type InlineStatus = {
  kind: 'success' | 'error';
  message: string;
};

type ConnectionsCatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

type ConnectionsCatalogState = {
  connections: Connection[] | null;
  status: ConnectionsCatalogStatus;
  error: string | null;
  refresh: () => Promise<void>;
};

type SharedConnectionsCatalogState = {
  userKey: string | null;
  requestKey: string | null;
  connections: Connection[] | null;
  status: ConnectionsCatalogStatus;
  error: string | null;
};

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring';

const CONNECTION_TYPES = [
  {
    id: 'gcs',
    label: 'Google Cloud Storage',
    provider: 'gcs',
    connection_type: 'gcp_service_account',
    fields: [
      { name: 'project_id', label: 'GCP Project ID', type: 'text', required: true },
      { name: 'client_email', label: 'Service Account Email', type: 'text', required: true },
      { name: 'private_key', label: 'Private Key (PEM)', type: 'textarea', required: true },
    ],
    metadataFields: ['project_id', 'client_email'],
    testFunction: 'load_gcs_list_objects',
  },
  {
    id: 'arangodb',
    label: 'ArangoDB',
    provider: 'arangodb',
    connection_type: 'arangodb_credential',
    fields: [
      { name: 'endpoint', label: 'Endpoint URL', type: 'text', required: true, placeholder: 'https://host:8529' },
      { name: 'database', label: 'Database', type: 'text', required: true, placeholder: '_system' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
    metadataFields: ['endpoint', 'database', 'username'],
    testFunction: 'load_arango_batch_insert',
  },
] as const;

type ConnectionTypeConfig = (typeof CONNECTION_TYPES)[number];

let sharedConnectionsCatalogState: SharedConnectionsCatalogState = {
  userKey: null,
  requestKey: null,
  connections: null,
  status: 'idle',
  error: null,
};

const connectionsCatalogListeners = new Set<() => void>();
const connectionsCatalogInflightByRequest = new Map<string, Promise<void>>();

function subscribeConnectionsCatalog(listener: () => void) {
  connectionsCatalogListeners.add(listener);
  return () => {
    connectionsCatalogListeners.delete(listener);
  };
}

function emitConnectionsCatalog() {
  connectionsCatalogListeners.forEach((listener) => listener());
}

function getConnectionsCatalogSnapshot() {
  return sharedConnectionsCatalogState;
}

function setSharedConnectionsCatalogState(
  next:
    | SharedConnectionsCatalogState
    | ((current: SharedConnectionsCatalogState) => SharedConnectionsCatalogState),
) {
  sharedConnectionsCatalogState =
    typeof next === 'function' ? next(sharedConnectionsCatalogState) : next;
  emitConnectionsCatalog();
}

function buildUserKey(userId: string | null) {
  return userId ?? null;
}

function buildRequestKey(userKey: string | null, accessToken: string | null) {
  if (!userKey || !accessToken) return null;
  return `${userKey}:${accessToken}`;
}

function resetSharedConnectionsCatalogState() {
  if (
    sharedConnectionsCatalogState.userKey === null &&
    sharedConnectionsCatalogState.requestKey === null &&
    sharedConnectionsCatalogState.connections === null &&
    sharedConnectionsCatalogState.status === 'idle' &&
    sharedConnectionsCatalogState.error === null
  ) {
    return;
  }

  connectionsCatalogInflightByRequest.clear();
  setSharedConnectionsCatalogState({
    userKey: null,
    requestKey: null,
    connections: null,
    status: 'idle',
    error: null,
  });
}

function describeFailure(status: number, body: { detail?: string; error?: string } | null) {
  return body?.detail ?? body?.error ?? `HTTP ${status}`;
}

async function resolveSharedConnectionsCatalog(
  userKey: string,
  requestKey: string,
  force = false,
): Promise<void> {
  if (!force) {
    const inFlight = connectionsCatalogInflightByRequest.get(requestKey);
    if (inFlight) return inFlight;
    if (
      sharedConnectionsCatalogState.userKey === userKey &&
      sharedConnectionsCatalogState.requestKey === requestKey &&
      sharedConnectionsCatalogState.status === 'ready'
    ) {
      return;
    }
  }

  setSharedConnectionsCatalogState((current) => {
    const hasResolvedConnections =
      current.userKey === userKey && current.connections !== null;

    return {
      userKey,
      requestKey,
      connections: hasResolvedConnections ? current.connections : null,
      status: hasResolvedConnections ? 'ready' : 'loading',
      error: null,
    };
  });

  const request = (async () => {
    try {
      const resp = await platformApiFetch('/connections');
      const body = (await resp.json().catch(() => null)) as
        | { connections?: Connection[]; detail?: string; error?: string }
        | null;

      if (!resp.ok) {
        throw new Error(describeFailure(resp.status, body));
      }

      const nextConnections = body?.connections ?? [];
      setSharedConnectionsCatalogState((current) => {
        if (current.userKey !== userKey || current.requestKey !== requestKey) return current;
        return {
          userKey,
          requestKey,
          connections: nextConnections,
          status: 'ready',
          error: null,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSharedConnectionsCatalogState((current) => {
        if (current.userKey !== userKey || current.requestKey !== requestKey) return current;
        return {
          userKey,
          requestKey,
          connections: current.connections,
          status: current.connections ? 'ready' : 'error',
          error: message,
        };
      });
    } finally {
      connectionsCatalogInflightByRequest.delete(requestKey);
    }
  })();

  connectionsCatalogInflightByRequest.set(requestKey, request);
  return request;
}

function useConnectionsCatalogState(): ConnectionsCatalogState {
  const { loading, session, user } = useAuth();
  const snapshot = useSyncExternalStore(
    subscribeConnectionsCatalog,
    getConnectionsCatalogSnapshot,
    getConnectionsCatalogSnapshot,
  );

  const userKey = buildUserKey(user?.id ?? null);
  const requestKey = buildRequestKey(userKey, session?.access_token ?? null);

  useEffect(() => {
    if (loading) return;

    if (!requestKey || !userKey) {
      resetSharedConnectionsCatalogState();
      return;
    }

    void resolveSharedConnectionsCatalog(userKey, requestKey);
  }, [loading, requestKey, userKey]);

  const refresh = useCallback(async () => {
    if (!requestKey || !userKey) return;
    await resolveSharedConnectionsCatalog(userKey, requestKey, true);
  }, [requestKey, userKey]);

  if (loading) {
    return {
      connections: null,
      status: 'loading',
      error: null,
      refresh,
    };
  }

  if (!requestKey || !userKey) {
    return {
      connections: null,
      status: 'idle',
      error: null,
      refresh,
    };
  }

  if (snapshot.userKey !== userKey) {
    return {
      connections: null,
      status: 'loading',
      error: null,
      refresh,
    };
  }

  if (snapshot.requestKey !== requestKey && snapshot.connections === null) {
    return {
      connections: null,
      status: 'loading',
      error: null,
      refresh,
    };
  }

  return {
    connections: snapshot.connections,
    status: snapshot.status,
    error: snapshot.error,
    refresh,
  };
}

export function resetConnectionsCatalogStateForTests() {
  resetSharedConnectionsCatalogState();
}

export default function ConnectionsPanel() {
  useShellHeaderTitle({ title: 'Connections', breadcrumbs: ['Settings', 'Connections'] });

  const {
    connections,
    status: connectionsStatus,
    error: connectionsError,
    refresh: loadConnections,
  } = useConnectionsCatalogState();
  const [inlineStatus, setInlineStatus] = useState<InlineStatus | null>(null);
  const [addingType, setAddingType] = useState<ConnectionTypeConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const connectionRows = connections ?? [];
  const isLoading = connectionsStatus === 'loading' && connections === null;

  const handleConnect = async (ct: ConnectionTypeConfig) => {
    setInlineStatus(null);
    setSaving(true);
    try {
      const credentials: Record<string, string> = {};
      const metadata: Record<string, string> = {};
      for (const field of ct.fields) {
        let value = formData[field.name] ?? '';
        // Normalize PEM keys pasted from JSON files: replace literal \n with real newlines
        if (field.name === 'private_key' && value.includes('\\n')) {
          value = value.replace(/\\n/g, '\n');
        }
        credentials[field.name] = value;
      }
      for (const key of ct.metadataFields) {
        if (credentials[key]) metadata[key] = credentials[key];
      }

      const resp = await platformApiFetch('/connections/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: ct.provider,
          connection_type: ct.connection_type,
          credentials,
          metadata,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(err.error ?? err.detail ?? `HTTP ${resp.status}`);
      }

      setInlineStatus({ kind: 'success', message: `${ct.label} connected successfully.` });
      setAddingType(null);
      setFormData({});
      await loadConnections();
    } catch (e) {
      setInlineStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (conn: Connection) => {
    setInlineStatus(null);
    try {
      await platformApiFetch('/connections/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: conn.provider,
          connection_type: conn.connection_type,
        }),
      });
      setInlineStatus({ kind: 'success', message: `${conn.provider} disconnected.` });
      await loadConnections();
    } catch (e) {
      setInlineStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleTest = async (conn: Connection, testFunction: string) => {
    setInlineStatus(null);
    setTesting(conn.id);
    try {
      const resp = await platformApiFetch('/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_id: conn.id,
          function_name: testFunction,
        }),
      });
      const data = await resp.json();
      if (data.valid) {
        setInlineStatus({ kind: 'success', message: `${conn.provider} connection test passed.` });
      } else {
        setInlineStatus({ kind: 'error', message: `Test failed: ${data.logs?.join(', ') ?? 'unknown error'}` });
      }
    } catch (e) {
      setInlineStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(null);
    }
  };

  const getTestFunction = (conn: Connection): string | null => {
    const ct = CONNECTION_TYPES.find((t) => t.provider === conn.provider);
    return ct?.testFunction ?? null;
  };

  return (
    <SettingsPageFrame
      title="Connections"
      description="Manage credentials for external data sources and destinations used by Load operations."
      headerVariant="admin"
    >
      {inlineStatus && (
        <div
          className={cn(
            'mb-4 rounded-md border px-3 py-2 text-sm',
            inlineStatus.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
          )}
          role="status"
        >
          {inlineStatus.message}
        </div>
      )}

      {/* Existing connections */}
      <SettingsSection title="Saved Connections">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : connectionsError && connectionRows.length === 0 ? (
          <p className="text-sm text-red-600 dark:text-red-400">Unable to load connections.</p>
        ) : connectionRows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No connections configured yet.</p>
        ) : (
          <div className="space-y-3">
            {connectionRows.map((conn) => {
              const testFn = getTestFunction(conn);
              return (
                <div
                  key={conn.id}
                  className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{conn.provider}</span>
                    <span className="text-xs text-muted-foreground">
                      {conn.connection_type} &middot;{' '}
                      <span className={conn.status === 'connected' ? 'text-emerald-600' : 'text-red-500'}>
                        {conn.status}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {testFn && (
                      <button
                        type="button"
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                        onClick={() => handleTest(conn, testFn)}
                        disabled={testing === conn.id || conn.status !== 'connected'}
                      >
                        {testing === conn.id ? 'Testing...' : 'Test'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                      onClick={() => handleDisconnect(conn)}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SettingsSection>

      {/* Add connection */}
      <div className="mt-6">
        <SettingsSection title="Add Connection">
          {!addingType ? (
            <div className="flex flex-wrap gap-2">
              {CONNECTION_TYPES.map((ct) => (
                <button
                  key={ct.id}
                  type="button"
                  className="rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                    onClick={() => {
                      setAddingType(ct);
                      setFormData({});
                      setInlineStatus(null);
                    }}
                  >
                    {ct.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">{addingType.label}</h4>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setAddingType(null);
                    setFormData({});
                    setInlineStatus(null);
                  }}
                >
                  Cancel
                </button>
              </div>

              {addingType.fields.map((field) => (
                <div key={field.name}>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">
                    {field.label}
                    {field.required && <span className="text-red-500"> *</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      className={cn(inputClass, 'min-h-[80px] font-mono text-xs')}
                      value={formData[field.name] ?? ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={('placeholder' in field ? field.placeholder : undefined) as string | undefined}
                    />
                  ) : (
                    <input
                      type={field.type}
                      className={inputClass}
                      value={formData[field.name] ?? ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={('placeholder' in field ? field.placeholder : undefined) as string | undefined}
                    />
                  )}
                </div>
              ))}

              <button
                type="button"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                onClick={() => handleConnect(addingType)}
                disabled={saving}
              >
                {saving ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          )}
        </SettingsSection>
      </div>
    </SettingsPageFrame>
  );
}
