# OAuth Login (Google + GitHub) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add "Continue with Google" and "Continue with GitHub" OAuth login to reduce signup friction — this becomes the first real self-service signup path (email registration is currently gated behind a "coming soon" page).

**Architecture:** Supabase Auth handles OAuth flows natively via PKCE. We add `signInWithOAuth()` to AuthContext, create a shared `OAuthButtons` component for the login page, and add a post-OAuth welcome page that collects display name. The existing profile trigger intentionally does NOT extract OAuth metadata (`full_name`, `name`) — it only reads `display_name`, which OAuth providers don't set. This means `profiles.display_name` stays null for new OAuth users, which is how `AuthCallback` detects first-time users and redirects to the welcome page.

**Tech Stack:** Supabase Auth (OAuth PKCE), React 19, React Router 7, Ark UI, Tailwind 4

---

## Prerequisites (Manual — Supabase Dashboard + Cloud Console)

Before any code runs, configure the OAuth providers:

1. **Google Cloud Console** (project `862494623920`, same as existing Drive Picker):
   - APIs & Services > Credentials > Create OAuth Client ID (Web application)
   - Authorized redirect URI: `https://dbdzzhshmigewyprahej.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret

2. **GitHub Developer Settings** > OAuth Apps > New OAuth App:
   - Authorization callback URL: `https://dbdzzhshmigewyprahej.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret

3. **Supabase Dashboard** > Authentication > Providers:
   - Enable Google: paste Client ID + Secret
   - Enable GitHub: paste Client ID + Secret
   - Under Authentication > Settings: ensure "Allow linking identities with the same email" is enabled

---

### Task 1: Add `signInWithOAuth` to AuthContext

This goes first because `OAuthButtons` (Task 2) consumes it.

**Files:**
- Modify: `web/src/auth/AuthContext.tsx`

**Step 1: Add to the AuthState type**

Add after the `signOut` line (~line 15):

```tsx
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
```

Full type becomes:
```tsx
type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: ProfileRow | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: { email: string; password: string; displayName?: string }) => Promise<{ needsEmailConfirmation: boolean }>;
  resendSignupConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
};
```

**Step 2: Implement the method**

Add after the `signOut` function (~line 145):

```tsx
  const signInWithOAuth = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };
```

**Step 3: Add to Provider value**

Update the value prop (~line 148) to include `signInWithOAuth`:

```tsx
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        profile,
        signIn,
        signUp,
        resendSignupConfirmation,
        signOut,
        signInWithOAuth,
      }}
    >
```

**Step 4: Verify it compiles**

Run: `cd web && npx tsc --noEmit`
Expected: no errors

**Step 5: Commit**

```bash
git add web/src/auth/AuthContext.tsx
git commit -m "feat: add signInWithOAuth to AuthContext"
```

---

### Task 2: Create `OAuthButtons` Shared Component

**Files:**
- Create: `web/src/components/auth/OAuthButtons.tsx`

**Step 1: Create the component**

```tsx
// web/src/components/auth/OAuthButtons.tsx
import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';

const PROVIDERS = [
  {
    id: 'google' as const,
    label: 'Continue with Google',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
  },
  {
    id: 'github' as const,
    label: 'Continue with GitHub',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
];

export function OAuthButtons() {
  const { signInWithOAuth } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoadingProvider(provider);
    setError(null);
    try {
      await signInWithOAuth(provider);
      // If no error, browser redirects to provider — component unmounts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth sign-in failed');
      setLoadingProvider(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {PROVIDERS.map((p) => (
        <Button
          key={p.id}
          variant="outline"
          className="w-full gap-3 h-11"
          disabled={loadingProvider !== null}
          onClick={() => handleOAuth(p.id)}
        >
          {p.icon}
          {loadingProvider === p.id ? 'Redirecting…' : p.label}
        </Button>
      ))}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd web && npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add web/src/components/auth/OAuthButtons.tsx
git commit -m "feat: add OAuthButtons component for Google + GitHub login"
```

---

### Task 3: Add OAuth Buttons to Login Page

**Files:**
- Modify: `web/src/pages/LoginSplit.tsx`

**Step 1: Add import**

Add after the existing imports (~line 7):

```tsx
import { OAuthButtons } from '@/components/auth/OAuthButtons';
```

**Step 2: Insert OAuth buttons + divider between error/info banners and the form**

Find this line (~line 83):
```tsx
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
```

Insert immediately before it:

```tsx
        <OAuthButtons />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

```

Everything else stays exactly as-is.

**Step 3: Verify visually**

Run: `cd web && npm run dev`
Navigate to `http://localhost:5173/login`
Expected: Google button, GitHub button, "or" divider, then existing email/password form below.

**Step 4: Commit**

```bash
git add web/src/pages/LoginSplit.tsx
git commit -m "feat: add OAuth buttons to login page"
```

---

### Task 4: Create Welcome Page (Post-OAuth Display Name Confirmation)

**Files:**
- Create: `web/src/pages/AuthWelcome.tsx`

**Step 1: Create the page**

```tsx
// web/src/pages/AuthWelcome.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Field } from '@ark-ui/react/field';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { Button } from '@/components/ui/button';

export default function AuthWelcome() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from OAuth metadata (Google: full_name, GitHub: name/user_name)
  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata;
    const name = meta?.display_name || meta?.full_name || meta?.name || meta?.user_name || '';
    setDisplayName(name);
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Already has display name — skip straight to app
  if (profile?.display_name) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const trimmed = displayName.trim();
    if (!trimmed) {
      setError('Please enter your name.');
      setSaving(false);
      return;
    }

    try {
      // Update user_metadata so future trigger runs pick up display_name
      const { error: metaError } = await supabase.auth.updateUser({
        data: { display_name: trimmed },
      });
      if (metaError) throw metaError;

      // Update profiles table directly for immediate use
      const { error: profileError } = await supabase
        .from(TABLES.profiles)
        .update({ display_name: trimmed })
        .eq('user_id', user.id);
      if (profileError) throw profileError;

      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save name');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-md border border-input bg-transparent px-3 py-2.5 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className="flex h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h2 className="mb-1 text-center text-2xl font-bold tracking-tight">Welcome!</h2>
        <p className="mb-8 text-center text-muted-foreground">
          Confirm your display name to get started.
        </p>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field.Root required>
            <Field.Label className="mb-1.5 text-sm font-medium text-foreground">
              Display name
            </Field.Label>
            <Field.Input
              className={inputClass}
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
          </Field.Root>

          <Button type="submit" disabled={saving} className="mt-2 w-full">
            {saving ? 'Saving…' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd web && npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add web/src/pages/AuthWelcome.tsx
git commit -m "feat: add AuthWelcome page for post-OAuth display name confirmation"
```

---

### Task 5: Add `/auth/welcome` Route

**Files:**
- Modify: `web/src/router.tsx`

**Step 1: Add import**

Add after the `AuthCallback` import (~line 10):

```tsx
import AuthWelcome from '@/pages/AuthWelcome';
```

**Step 2: Add the route**

Find this block (~line 122-127):
```tsx
  {
    element: <PublicLayout />,
    children: [
      { path: '/auth/callback', element: <AuthCallback /> },
    ],
  },
```

Add the welcome route so it becomes:
```tsx
  {
    element: <PublicLayout />,
    children: [
      { path: '/auth/callback', element: <AuthCallback /> },
      { path: '/auth/welcome', element: <AuthWelcome /> },
    ],
  },
```

`AuthWelcome` handles its own auth check (redirects to `/login` if no session), so `AuthGuard` is not needed.

**Step 3: Commit**

```bash
git add web/src/router.tsx
git commit -m "feat: add /auth/welcome route"
```

---

### Task 6: Update AuthCallback to Detect First-Time Users

**Files:**
- Modify: `web/src/pages/AuthCallback.tsx`

**Why this is last:** It depends on the welcome page (Task 4) and route (Task 5) existing.

**Important context:** `/auth/callback` handles both OAuth redirects AND email confirmation links. The first-time check (`!profile?.display_name`) works correctly for both:
- OAuth users: trigger only reads `display_name` key (not `full_name`/`name`), so it's null → welcome page shows
- Email confirmation: user already set display_name at signup → goes to `/app`
- Password reset: user has existing account with display_name → goes to `/app`

**Step 1: Replace the `finish` function**

Find the `finish` async function (~lines 18-40). Replace its entire body:

```tsx
    const finish = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          setStatus('error');
          setMessage('No session found. Please sign in again.');
          navigate('/login', { replace: true });
          return;
        }

        setStatus('ok');
        setMessage('Signed in. Redirecting…');

        // First-time user detection: profile trigger only reads the
        // 'display_name' metadata key, which OAuth providers don't set
        // (Google uses 'full_name', GitHub uses 'name'). So for new OAuth
        // users, profiles.display_name is null → redirect to welcome page.
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', data.session.user.id)
          .maybeSingle();

        const dest = !profile?.display_name ? '/auth/welcome' : nextPath;
        navigate(dest, { replace: true });
      } catch (e) {
        setStatus('error');
        setMessage(e instanceof Error ? e.message : String(e));
        navigate('/login', { replace: true });
      } finally {
        finished = true;
      }
    };
```

No new imports needed — `supabase` is already imported.

**Step 2: Verify it compiles**

Run: `cd web && npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add web/src/pages/AuthCallback.tsx
git commit -m "feat: detect first-time OAuth users in auth callback, redirect to welcome"
```

---

## What Was Intentionally Excluded

| Item | Why |
|------|-----|
| **Profile trigger migration** | The trigger's current behavior (only reading `display_name`) is correct — it keeps `display_name` null for OAuth users, which is how we detect first-timers for the welcome page. Fixing the trigger would bypass the welcome page. |
| **RegisterSplit changes** | `/register` redirects to `/early-access` (a "coming soon" splash). `RegisterSplit.tsx` is unreachable dead code. |
| **Account management settings** | Deferred — no link/unlink UI for connected accounts now. |
| **Backend (platform-api) changes** | None needed — it already validates Supabase JWTs identically regardless of auth method. |

## Verification

1. **Google login (new user):** `/login` > "Continue with Google" > Google consent > `/auth/callback` > `/auth/welcome` (name pre-filled from `full_name`) > "Continue" > `/app`
2. **GitHub login (new user):** Same flow with GitHub (pre-filled from `name` or `user_name`)
3. **Returning OAuth user:** "Continue with Google" > callback > straight to `/app` (display_name already set)
4. **Account linking:** Create account with email/password, sign out, "Continue with Google" with same email > logs into same account (Supabase auto-links by verified email)
5. **Email/password login unchanged:** Form below the divider still works identically
6. **Email confirmation callback:** User confirms email > callback > `/app` (not welcome page, because email signup sets `display_name`)