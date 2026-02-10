import { useState } from 'react';
import { TextInput, PasswordInput, Button, Title, Stack, Text, Anchor } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

export default function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      notifications.show({
        color: 'red',
        title: 'Passwords do not match',
        message: 'Please re-enter your password.',
      });
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
        notifications.show({
          color: 'blue',
          title: 'Confirm your email',
          message: 'Check your inbox to confirm your email, then sign in.',
        });
        navigate('/login');
      } else {
        notifications.show({
          color: 'green',
          title: 'Account created',
          message: 'Welcome! You are now signed in.',
        });
        navigate('/app');
      }
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Sign up failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <Title order={2} ta="center">Create account</Title>
        <Text size="sm" c="dimmed" ta="center">Start a new BlockData workspace</Text>

        <TextInput
          label="Name"
          placeholder="Jane Doe"
          value={displayName}
          onChange={(e) => setDisplayName(e.currentTarget.value)}
        />

        <TextInput
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          required
        />

        <PasswordInput
          label="Password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
        />

        <PasswordInput
          label="Confirm password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.currentTarget.value)}
          required
        />

        <Button type="submit" loading={loading} fullWidth>
          Create account
        </Button>

        <Text size="sm" c="dimmed" ta="center">
          Already have an account?{' '}
          <Anchor component={Link} to="/login">
            Sign in
          </Anchor>
        </Text>
      </Stack>
    </form>
  );
}
