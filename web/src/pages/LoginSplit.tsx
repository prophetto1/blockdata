import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Field } from '@ark-ui/react/field';
import { PasswordInput } from '@ark-ui/react/password-input';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';

export default function LoginSplit() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { signIn, resendSignupConfirmation } = useAuth();
  const navigate = useNavigate();

  const inputClass =
    'w-full rounded-md border border-input bg-transparent px-3 py-2.5 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await signIn(email, password);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await resendSignupConfirmation(email);
      setInfo('Check your inbox to confirm your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const showResend =
    !!email &&
    !!error &&
    /confirm|confirmed|verification|verify/i.test(error);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h2 className="mb-1 text-center text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="mb-8 text-center text-muted-foreground">Enter your credentials to access your workspace.</p>

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
                placeholder="••••••••"
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

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>

          {showResend && (
            <button
              type="button"
              className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
              onClick={handleResend}
              disabled={loading}
            >
              Resend confirmation email
            </button>
          )}
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/early-access" className="font-semibold text-primary underline-offset-4 hover:underline">
            Start building
          </Link>
        </p>
      </div>
    </div>
  );
}
