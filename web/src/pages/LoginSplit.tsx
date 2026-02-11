import { useState } from 'react';
import {
  TextInput,
  PasswordInput,
  Button,
  Title,
  Stack,
  Text,
  Anchor,
  Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

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
    <Box style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: 'var(--mantine-spacing-xl)' }}>
      <Box maw={440} w="100%">
        <Title order={2} mb="xs" ta="center">Welcome back</Title>
        <Text c="dimmed" mb="xl" ta="center">Enter your credentials to access your workspace.</Text>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="name@work-email.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              size="md"
            />
            <PasswordInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
              size="md"
            />
            <Button type="submit" loading={loading} fullWidth size="md" mt="sm">
              Sign in
            </Button>
            {showResend && (
              <Button variant="subtle" size="xs" onClick={handleResend} loading={loading}>
                Resend confirmation email
              </Button>
            )}
          </Stack>
        </form>

        <Text size="sm" c="dimmed" mt="xl" ta="center">
          Don&apos;t have an account?{' '}
          <Anchor component={Link} to="/register" fw={600} c="teal">
            Start building
          </Anchor>
        </Text>
      </Box>
    </Box>
  );
}