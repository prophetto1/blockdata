import { useState } from 'react';
import { PasswordInput } from '@ark-ui/react/password-input';
import { Field } from '@ark-ui/react/field';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { AuthBrandPanel } from '@/components/layout/AuthBrandPanel';

export default function RegisterSplit() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { needsEmailConfirmation } = await signUp({
        email,
        password,
        displayName: displayName.trim() || undefined,
      });

      if (needsEmailConfirmation) {
        setInfo('Check your inbox to confirm your email, then sign in.');
        navigate('/login');
      } else {
        navigate('/app');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-md border border-input bg-transparent px-3 py-2.5 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className="flex flex-1">
      <AuthBrandPanel />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-110">
          <h2 className="mb-1 text-center text-2xl font-bold tracking-tight">Create your account</h2>
          <p className="mb-8 text-center text-muted-foreground">
            Start building pipelines from your data.
          </p>

          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field.Root>
              <Field.Label className="mb-1.5 text-sm font-medium text-foreground">Full Name</Field.Label>
              <Field.Input
                className={inputClass}
                placeholder="Jane Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Field.Root>

            <Field.Root required>
              <Field.Label className="mb-1.5 text-sm font-medium text-foreground">Email</Field.Label>
              <Field.Input
                className={inputClass}
                type="email"
                placeholder="name@work-email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field.Root>

            <PasswordInput.Root className="flex flex-col gap-1.5">
              <PasswordInput.Label className="text-sm font-medium text-foreground">Password</PasswordInput.Label>
              <PasswordInput.Control className="relative flex items-center">
                <PasswordInput.Input
                  className={inputClass + ' pr-10'}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                />
                <PasswordInput.VisibilityTrigger className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground">
                  <PasswordInput.Indicator fallback={<IconEyeOff size={16} />}>
                    <IconEye size={16} />
                  </PasswordInput.Indicator>
                </PasswordInput.VisibilityTrigger>
              </PasswordInput.Control>
            </PasswordInput.Root>

            <PasswordInput.Root className="flex flex-col gap-1.5">
              <PasswordInput.Label className="text-sm font-medium text-foreground">Confirm Password</PasswordInput.Label>
              <PasswordInput.Control className="relative flex items-center">
                <PasswordInput.Input
                  className={inputClass + ' pr-10'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  required
                />
                <PasswordInput.VisibilityTrigger className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground">
                  <PasswordInput.Indicator fallback={<IconEyeOff size={16} />}>
                    <IconEye size={16} />
                  </PasswordInput.Indicator>
                </PasswordInput.VisibilityTrigger>
              </PasswordInput.Control>
            </PasswordInput.Root>

            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
