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
  Paper,
  Container,
  Group,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate, Link } from 'react-router-dom';
import { IconLock, IconBrandGithub, IconBrandGoogle } from '@tabler/icons-react'; // Example icons
import { useAuth } from '@/auth/AuthContext';

/**
 * CONCEPT B: Minimal Layout
 * - Center: Floating, elegant card on a subtle dot/grid background.
 * - Aesthetic: "Vercel-like" simplicity. Focus on the form.
 */
export default function LoginMinimal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/app');
    } catch (err) {
      notifications.show({ color: 'red', title: 'Login failed', message: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
        style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'var(--mantine-color-body)',
            backgroundImage: 'radial-gradient(var(--mantine-color-default-border) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
        }}
    >
      <Container size="xs" w="100%">
        <Stack gap="xl">
            <Stack align="center" gap="xs">
                <ThemeIcon size={48} radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }}>
                    <IconLock size={24} />
                </ThemeIcon>
                <Title order={2} fz={24}>Log in to BlockData</Title>
                <Text c="dimmed" size="sm">Welcome back! Please enter your details.</Text>
            </Stack>

            <Paper withBorder shadow="sm" radius="md" p="xl" bg="var(--mantine-color-body)">
                <form onSubmit={handleSubmit}>
                    <Stack gap="md">
                    <TextInput
                        label="Email"
                        placeholder="you@company.com"
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
                    </Stack>
                </form>

                <Group gap="xs" my="lg">
                    <div style={{ flex: 1, height: 1, background: 'var(--mantine-color-default-border)' }} />
                    <Text size="xs" c="dimmed">OR CONTINUE WITH</Text>
                    <div style={{ flex: 1, height: 1, background: 'var(--mantine-color-default-border)' }} />
                </Group>

                <Group grow>
                    <Button variant="default" leftSection={<IconBrandGithub size={16} />}>GitHub</Button>
                    <Button variant="default" leftSection={<IconBrandGoogle size={16} />}>Google</Button>
                </Group>
            </Paper>

            <Text size="sm" c="dimmed" ta="center">
                Don't have an account?{' '}
                <Anchor component={Link} to="/register" fw={500}>
                    Sign up
                </Anchor>
            </Text>
        </Stack>
      </Container>
    </Box>
  );
}
