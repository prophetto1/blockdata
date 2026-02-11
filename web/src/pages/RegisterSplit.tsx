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
  SimpleGrid,
  ThemeIcon,
  Code,
  Group,
  List,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate, Link } from 'react-router-dom';
import { IconCheck } from '@tabler/icons-react';
import { useAuth } from '@/auth/AuthContext';

/**
 * Split Layout
 * - Left: Focused account creation form
 * - Right: Dark feature panel (schema mock)
 */
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
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} style={{ flex: 1 }}>
      <Box style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'var(--mantine-spacing-xl)' }}>
        <Box maw={440} mx="auto" w="100%">
          <Group mb="xl" gap="xs">
            <img src="/icon-64.png" alt="" width={28} height={28} style={{ display: 'block' }} />
            <Text fw={700}>BlockData</Text>
          </Group>

          <Title order={1} fz={28} mb="xs">Create your account</Title>
          <Text c="dimmed" mb="xl">Start building structure from your unstructured data.</Text>

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
            <Anchor component={Link} to="/login" fw={600} c="indigo">
              Sign in
            </Anchor>
          </Text>
        </Box>
      </Box>

      <Box
        visibleFrom="md"
        bg="var(--mantine-color-dark-8)"
        p={80}
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.1,
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        <Box style={{ position: 'relative', zIndex: 1 }}>
          <Box mb="xl" p="md" style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--mantine-radius-md)', background: 'rgba(0,0,0,0.3)' }}>
            <Group gap="xs" mb="sm" pb="xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <Text size="xs" c="dimmed" ff="monospace">schema.json</Text>
            </Group>
            <Code block bg="transparent" c="dimmed" style={{ fontSize: 13, lineHeight: 1.6 }}>
              {`{
  "name": "lease_agreement",
  "fields": [
    { "name": "parties", "type": "list" },
    { "name": "term_months", "type": "number" },
    { "name": "monthly_rent", "type": "currency" },
    { "name": "termination_clause", "type": "boolean" }
  ]
}`}
            </Code>
          </Box>

          <Title order={2} style={{ color: 'white' }} mb="md">
            Define once. Extract forever.
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.7)' }} mb="xl" maw={400} lh={1.6}>
            Join thousands of developers turning PDFs, Word docs, and websites into clean, queryable JSON.
          </Text>

          <List
            spacing="sm"
            size="sm"
            center
            icon={(
              <ThemeIcon color="indigo" size={24} radius="xl">
                <IconCheck size={14} />
              </ThemeIcon>
            )}
            styles={{ item: { color: 'rgba(255,255,255,0.9)' } }}
          >
            <List.Item>Unlimited document uploads</List.Item>
            <List.Item>Custom schema builder</List.Item>
            <List.Item>API &amp; Webhook integrations</List.Item>
          </List>
        </Box>
      </Box>
    </SimpleGrid>
  );
}
