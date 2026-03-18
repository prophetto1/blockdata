import { useEffect, useMemo, useState } from 'react';
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
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          setStatus('error');
          setMessage('No session found. Please sign in again.');
          navigate('/login', { replace: true });
          return;
        }

        setStatus('ok');
        setMessage('Signed in. Redirecting…');

        // First-time user detection: profile trigger only reads the
        // 'display_name' metadata key, which OAuth providers don't set
        // (Google uses 'full_name', GitHub uses 'name'). So for new OAuth
        // users, profiles.display_name is null → redirect to welcome page.
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', data.session.user.id)
          .maybeSingle();

        const dest = !profile?.display_name ? '/auth/welcome' : nextPath;
        navigate(dest, { replace: true });
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
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <span className={`text-sm ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
          {message}
        </span>
      </div>
    </div>
  );
}
