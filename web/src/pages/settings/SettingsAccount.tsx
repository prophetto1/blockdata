import { useEffect, useMemo, useState } from 'react';
import { Field } from '@ark-ui/react/field';
import { PasswordInput } from '@ark-ui/react/password-input';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';

type InlineStatus = {
  kind: 'success' | 'error' | 'info';
  message: string;
};

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring';

function getInitialDisplayName(
  profileDisplayName: string | null | undefined,
  metadataDisplayName: unknown,
) {
  if (profileDisplayName && profileDisplayName.trim()) return profileDisplayName;
  if (typeof metadataDisplayName === 'string' && metadataDisplayName.trim()) return metadataDisplayName;
  return '';
}

export default function SettingsAccount() {
  const { user, profile } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [status, setStatus] = useState<InlineStatus | null>(null);

  const initialDisplayName = useMemo(
    () => getInitialDisplayName(profile?.display_name, user?.user_metadata?.display_name),
    [profile?.display_name, user?.user_metadata?.display_name],
  );

  const initialEmail = useMemo(
    () => (user?.email ?? profile?.email ?? ''),
    [user?.email, profile?.email],
  );

  useEffect(() => {
    setDisplayName(initialDisplayName);
  }, [initialDisplayName]);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setStatus(null);
    setSavingProfile(true);
    try {
      const trimmedDisplayName = displayName.trim() || null;
      const trimmedEmail = email.trim();
      const emailChanged = trimmedEmail.length > 0 && trimmedEmail !== (user.email ?? '');

      const updatePayload: { email?: string; data?: Record<string, unknown> } = {};
      if (emailChanged) updatePayload.email = trimmedEmail;
      updatePayload.data = { display_name: trimmedDisplayName };

      const { error: authError } = await supabase.auth.updateUser(updatePayload);
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from(TABLES.profiles)
        .upsert(
          {
            user_id: user.id,
            email: trimmedEmail || null,
            display_name: trimmedDisplayName,
          },
          { onConflict: 'user_id' },
        );
      if (profileError) throw profileError;

      setStatus({
        kind: emailChanged ? 'info' : 'success',
        message: emailChanged
          ? 'Profile saved. Check your inbox to confirm the new email address.'
          : 'Profile updated.',
      });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    setStatus(null);

    if (newPassword.length < 8) {
      setStatus({ kind: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ kind: 'error', message: 'Password confirmation does not match.' });
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      setStatus({ kind: 'success', message: 'Password updated.' });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return <p className="text-sm text-muted-foreground">No authenticated user session found.</p>;
  }

  return (
    <div className="space-y-4">
      {status && (
        <div
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
          role="status"
          aria-live="polite"
        >
          {status.message}
        </div>
      )}

      <section className="rounded-md border border-border bg-card p-4 md:p-6">
        <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Update your account display name and email address.
        </p>

        <div className="mt-4 space-y-4">
          <Field.Root>
            <Field.Label className="mb-1.5 block text-sm font-medium text-foreground">Display name</Field.Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.currentTarget.value)}
              placeholder="Your name"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label className="mb-1.5 block text-sm font-medium text-foreground">Email</Field.Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="name@company.com"
            />
          </Field.Root>

          <div className="flex justify-end">
            <Button type="button" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save profile'}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-border bg-card p-4 md:p-6">
        <h2 className="text-sm font-semibold text-foreground">Password</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Set a new password for this account.
        </p>

        <div className="mt-4 space-y-4">
          <PasswordInput.Root className="space-y-1.5">
            <PasswordInput.Label className="block text-sm font-medium text-foreground">New password</PasswordInput.Label>
            <PasswordInput.Control className="relative flex items-center">
              <PasswordInput.Input
                className={`${inputClass} pr-10`}
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.currentTarget.value)}
                placeholder="At least 8 characters"
              />
              <PasswordInput.VisibilityTrigger className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground">
                <PasswordInput.Indicator fallback={<IconEyeOff size={16} />}>
                  <IconEye size={16} />
                </PasswordInput.Indicator>
              </PasswordInput.VisibilityTrigger>
            </PasswordInput.Control>
          </PasswordInput.Root>

          <PasswordInput.Root className="space-y-1.5">
            <PasswordInput.Label className="block text-sm font-medium text-foreground">Confirm password</PasswordInput.Label>
            <PasswordInput.Control className="relative flex items-center">
              <PasswordInput.Input
                className={`${inputClass} pr-10`}
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.currentTarget.value)}
                placeholder="Repeat new password"
              />
              <PasswordInput.VisibilityTrigger className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground">
                <PasswordInput.Indicator fallback={<IconEyeOff size={16} />}>
                  <IconEye size={16} />
                </PasswordInput.Indicator>
              </PasswordInput.VisibilityTrigger>
            </PasswordInput.Control>
          </PasswordInput.Root>

          <div className="flex justify-end">
            <Button type="button" onClick={handleUpdatePassword} disabled={savingPassword}>
              {savingPassword ? 'Updating...' : 'Update password'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
