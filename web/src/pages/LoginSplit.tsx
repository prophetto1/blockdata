import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

const inputClass = 'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
const btnPrimary = 'mt-2 flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50';
const btnSubtle = 'rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:pointer-events-none disabled:opacity-50';

export default function LoginSplit() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { signIn, resendSignupConfirmation } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setAuthError(null);
      await signIn(email, password);
      navigate('/app');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setAuthError(msg);
      notifications.show({ color: 'red', title: 'Login failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await resendSignupConfirmation(email);
      notifications.show({
        color: 'blue',
        title: 'Confirmation sent',
        message: 'Check your inbox to confirm your email.',
      });
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Resend failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const showResend =
    !!email &&
    !!authError &&
    /confirm|confirmed|verification|verify/i.test(authError);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        <h2 className="mb-1 text-center text-xl font-bold">Welcome back</h2>
        <p className="mb-6 text-center text-muted-foreground">Enter your credentials to access your workspace.</p>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                className={inputClass}
                placeholder="name@work-email.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                className={inputClass}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
              />
            </div>
            <button type="submit" className={btnPrimary} disabled={loading}>
              {loading && <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              Sign in
            </button>
            {showResend && (
              <button type="button" className={btnSubtle} onClick={handleResend} disabled={loading}>
                {loading && <div className="mr-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                Resend confirmation email
              </button>
            )}
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-teal-600 underline-offset-4 hover:underline dark:text-teal-400">
            Start building
          </Link>
        </p>
      </div>
    </div>
  );
}
