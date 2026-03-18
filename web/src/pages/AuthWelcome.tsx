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
