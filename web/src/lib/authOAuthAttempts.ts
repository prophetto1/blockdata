const PLATFORM_API_URL = (
  import.meta.env.MODE === 'test'
    ? '/platform-api'
    : (import.meta.env.VITE_PLATFORM_API_URL ?? '/platform-api')
).replace(/\/+$/, '');

const STORAGE_KEY = 'auth.oauth.attempt';

export type OAuthProvider = 'google' | 'github';
export type OAuthAttemptEvent =
  | 'callback_received'
  | 'session_detected'
  | 'profile_missing'
  | 'profile_present'
  | 'completed'
  | 'failed';
export type OAuthAttemptResult = 'welcome' | 'app' | 'login_error';
export type OAuthAttemptFailureCategory =
  | 'provider_disabled'
  | 'callback_error'
  | 'no_session'
  | 'profile_lookup_failed'
  | 'unexpected';
export type OAuthAttemptProfileState = 'missing' | 'present';

type CreateOAuthAttemptInput = {
  provider: OAuthProvider;
  redirectOrigin: string;
  nextPath?: string | null;
};

type RecordOAuthAttemptEventInput = {
  attemptId: string;
  attemptSecret: string;
  event: OAuthAttemptEvent;
  result?: OAuthAttemptResult;
  failureCategory?: OAuthAttemptFailureCategory;
  callbackErrorCode?: string;
  profileState?: OAuthAttemptProfileState;
  httpStatusCode?: number;
};

type StoredOAuthAttempt = {
  attemptId: string;
  attemptSecret: string;
};

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') return data.detail;
    if (typeof data?.message === 'string') return data.message;
    if (typeof data?.error === 'string') return data.error;
  } catch {
    // Fall through to generic message.
  }

  return `OAuth attempt request failed with status ${response.status}`;
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json() as Promise<T>;
}

export async function createOAuthAttempt(input: CreateOAuthAttemptInput): Promise<{
  attemptId: string;
  attemptSecret: string;
  expiresAt: string;
}> {
  const payload: Record<string, unknown> = {
    provider: input.provider,
    redirect_origin: input.redirectOrigin,
  };
  if (input.nextPath !== undefined) {
    payload.next_path = input.nextPath;
  }

  const response = await fetch(`${PLATFORM_API_URL}/auth/oauth/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonOrThrow<{
    attempt_id: string;
    attempt_secret: string;
    expires_at: string;
  }>(response);

  return {
    attemptId: data.attempt_id,
    attemptSecret: data.attempt_secret,
    expiresAt: data.expires_at,
  };
}

export async function recordOAuthAttemptEvent(
  input: RecordOAuthAttemptEventInput,
): Promise<{ ok: true; status: string }> {
  const payload: Record<string, unknown> = {
    attempt_secret: input.attemptSecret,
    event: input.event,
  };
  if (input.result !== undefined) {
    payload.result = input.result;
  }
  if (input.failureCategory !== undefined) {
    payload.failure_category = input.failureCategory;
  }
  if (input.callbackErrorCode !== undefined) {
    payload.callback_error_code = input.callbackErrorCode;
  }
  if (input.profileState !== undefined) {
    payload.profile_state = input.profileState;
  }
  if (input.httpStatusCode !== undefined) {
    payload.http_status_code = input.httpStatusCode;
  }

  const response = await fetch(
    `${PLATFORM_API_URL}/auth/oauth/attempts/${input.attemptId}/events`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  return parseJsonOrThrow<{ ok: true; status: string }>(response);
}

export function storeOAuthAttempt(attempt: StoredOAuthAttempt): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
}

export function readStoredOAuthAttempt(): StoredOAuthAttempt | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredOAuthAttempt>;
    if (!parsed.attemptId || !parsed.attemptSecret) return null;
    return {
      attemptId: parsed.attemptId,
      attemptSecret: parsed.attemptSecret,
    };
  } catch {
    return null;
  }
}

export function clearStoredOAuthAttempt(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export async function finalizeStoredOAuthAttemptFailure(input: {
  failureCategory: OAuthAttemptFailureCategory;
  result: OAuthAttemptResult;
  callbackErrorCode?: string;
  httpStatusCode?: number;
}): Promise<void> {
  const stored = readStoredOAuthAttempt();

  try {
    if (stored) {
      await recordOAuthAttemptEvent({
        attemptId: stored.attemptId,
        attemptSecret: stored.attemptSecret,
        event: 'failed',
        result: input.result,
        failureCategory: input.failureCategory,
        callbackErrorCode: input.callbackErrorCode,
        httpStatusCode: input.httpStatusCode,
      });
    }
  } finally {
    clearStoredOAuthAttempt();
  }
}
