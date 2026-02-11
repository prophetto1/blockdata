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

export default function RegisterSplit() {
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
      notifications.show({ color: 'red', title: 'Error', message: 'Passwords do not match' });
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
        notifications.show({ color: 'green', title: 'Account created', message: 'Welcome! You are now signed in.' });
        navigate('/app');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      notifications.show({ color: 'red', title: 'Registration failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: 'var(--mantine-spacing-xl)' }}>
      <Box maw={440} w="100%">
        <Title order={2} mb="xs" ta="center">Create your account</Title>
        <Text c="dimmed" mb="xl" ta="center">Start building structure from your unstructured data.</Text>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Full Name"
              placeholder="Jane Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.currentTarget.value)}
              size="md"
            />
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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
              size="md"
            />
            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              required
              size="md"
            />
            <Button type="submit" loading={loading} fullWidth size="md" mt="sm">
              Create account
            </Button>
          </Stack>
        </form>

        <Text size="sm" c="dimmed" mt="xl" ta="center">
          Already have an account?{' '}
          <Anchor component={Link} to="/login" fw={600} c="teal">
            Sign in
          </Anchor>
        </Text>
      </Box>
    </Box>
  );
}