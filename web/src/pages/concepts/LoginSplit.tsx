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
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate, Link } from 'react-router-dom';
import { IconTerminal2, IconCheck } from '@tabler/icons-react';
import { useAuth } from '@/auth/AuthContext';

/**
 * CONCEPT A: Split Layout
 * - Left: Clean, focused login form.
 * - Right: Dark "feature" panel showing the product in action (mock terminal/code).
 * - Aesthetic: Linear-style, high contrast.
 */
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
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} style={{ minHeight: 'calc(100vh - 56px)' }}>
      {/* LEFT: Form Section */}
      <Box style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'var(--mantine-spacing-xl)' }}>
        <Box maw={440} mx="auto" w="100%">
          <Group mb="xl" gap="xs">
             <ThemeIcon variant="transparent" color="indigo"><IconTerminal2 /></ThemeIcon>
             <Text fw={700}>BlockData</Text>
          </Group>
          
          <Title order={1} fz={28} mb="xs">Welcome back</Title>
          <Text c="dimmed" mb="xl">Enter your credentials to access your workspace.</Text>

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
            Don't have an account?{' '}
            <Anchor component={Link} to="/register" fw={600} c="indigo">
              Start building
            </Anchor>
          </Text>
        </Box>
      </Box>

      {/* RIGHT: Visual / Brand Section (Hidden on mobile) */}
      <Box
        visibleFrom="md"
        bg="var(--mantine-color-dark-8)" // Force dark background even in light mode
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
        {/* Abstract background pattern */}
        <div style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.1,
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
        }} />

        <Box style={{ position: 'relative', zIndex: 1 }}>
            <Box mb="xl" p="md" style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--mantine-radius-md)', background: 'rgba(0,0,0,0.3)' }}>
                <Group gap="xs" mb="sm" pb="xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
                </Group>
                <Code block bg="transparent" c="dimmed" style={{ fontSize: 12 }}>
                  {`> Processing document: annual_report_2024.pdf
> Analyzing structure...
> Detected 845 blocks
> Schema applied: "FinancialTable"
> Extracting data...
> Completed in 1.2s`}
                </Code>
            </Box>

            <Title order={2} style={{ color: 'white' }} mb="md">
              Structured data extraction at scale.
            </Title>
            <Stack gap="sm">
                {['Immutable block IDs', 'Schema-enforced output', 'Live pipeline auditing'].map(item => (
                    <Group key={item} gap="sm">
                        <ThemeIcon size="xs" radius="xl" color="green" variant="filled">
                            <IconCheck size={10} />
                        </ThemeIcon>
                        <Text size="sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{item}</Text>
                    </Group>
                ))}
            </Stack>
        </Box>
      </Box>
    </SimpleGrid>
  );
}
