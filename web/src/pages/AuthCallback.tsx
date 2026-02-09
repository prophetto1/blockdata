import { useEffect, useMemo, useState } from 'react';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'working' | 'ok' | 'error'>('working');
  const [message, setMessage] = useState<string>('Finishing sign-in…');

  const nextPath = useMemo(() => {
    const url = new URL(window.location.href);
    const next = url.searchParams.get('next');
    return next && next.startsWith('/') ? next : '/app';
  }, []);

  useEffect(() => {
    let finished = false;
    const finish = async () => {
      try {
        // supabase-js is configured with `detectSessionInUrl: true`, so by the time this
        // route mounts the session is usually already persisted.
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          setStatus('ok');
          setMessage('Signed in. Redirecting…');
          navigate(nextPath, { replace: true });
          return;
        }

        setStatus('error');
        setMessage('No session found. Please sign in again.');
        navigate('/login', { replace: true });
      } catch (e) {
        setStatus('error');
        setMessage(e instanceof Error ? e.message : String(e));
        navigate('/login', { replace: true });
      } finally {
        finished = true;
      }
    };

    // Some redirects land before storage/session is fully written; a short delay makes this robust.
    const t = window.setTimeout(() => {
      if (!finished) void finish();
    }, 150);

    return () => window.clearTimeout(t);
  }, [navigate, nextPath]);

  return (
    <Center h="100vh">
      <Stack align="center" gap="xs">
        <Loader />
        <Text size="sm" c={status === 'error' ? 'red' : 'dimmed'}>
          {message}
        </Text>
      </Stack>
    </Center>
  );
}

