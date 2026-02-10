import { useState } from 'react';
import { TextInput, PasswordInput, Button, Title, Stack, Text, Anchor } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

export default function Login() {
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
      notifications.show({
        color: 'red',
        title: 'Login failed',
        message: msg,
      });
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
    <form onSubmit={handleSubmit}>
      <Stack>
        <Title order={2} ta="center">BlockData</Title>
        <Text size="sm" c="dimmed" ta="center">Sign in to continue</Text>
        <TextInput
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          required
        />
        <PasswordInput
          label="Password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
        />
        <Button type="submit" loading={loading} fullWidth>
          Sign in
        </Button>
        {showResend && (
          <Button variant="subtle" size="xs" onClick={handleResend} loading={loading}>
            Resend confirmation email
          </Button>
        )}
        <Text size="sm" c="dimmed" ta="center">
          New here?{' '}
          <Anchor component={Link} to="/register">
            Create an account
          </Anchor>
        </Text>
      </Stack>
    </form>
  );
}
