import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearStoredOAuthAttempt,
  readStoredOAuthAttempt,
  recordOAuthAttemptEvent,
  type OAuthAttemptFailureCategory,
  type OAuthAttemptProfileState,
  type OAuthAttemptResult,
} from '@/lib/authOAuthAttempts';
import { supabase } from '@/lib/supabase';

function encodeLoginError(message: string): string {
  return `/login?auth_error=${encodeURIComponent(message)}`;
}

function readCallbackError(): { code: string | null; message: string } | null {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  const code =
    hashParams.get('error') ??
    url.searchParams.get('error') ??
    hashParams.get('error_code') ??
    url.searchParams.get('error_code');

  const description =
    hashParams.get('error_description') ??
    url.searchParams.get('error_description') ??
    hashParams.get('error_message') ??
    url.searchParams.get('error_message');

  if (!code && !description) return null;

  return {
    code,
    message: description ?? 'Authentication failed. Please sign in again.',
  };
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'working' | 'ok' | 'error'>('working');
  const [message, setMessage] = useState<string>('Finishing sign-in...');

  const nextPath = useMemo(() => {
    const url = new URL(window.location.href);
    const next = url.searchParams.get('next');
    return next && next.startsWith('/') ? next : '/app';
  }, []);

  useEffect(() => {
    let cancelled = false;
    const storedAttempt = readStoredOAuthAttempt();

    const recordAttemptEvent = async (input: {
      event:
        | 'callback_received'
        | 'session_detected'
        | 'profile_missing'
        | 'profile_present'
        | 'completed'
        | 'failed';
      result?: OAuthAttemptResult;
      failureCategory?: OAuthAttemptFailureCategory;
      callbackErrorCode?: string;
      profileState?: OAuthAttemptProfileState;
    }) => {
      if (!storedAttempt) return;

      try {
        await recordOAuthAttemptEvent({
          attemptId: storedAttempt.attemptId,
          attemptSecret: storedAttempt.attemptSecret,
          event: input.event,
          result: input.result,
          failureCategory: input.failureCategory,
          callbackErrorCode: input.callbackErrorCode,
          profileState: input.profileState,
        });
      } catch (error) {
        console.warn(
          '[auth] failed to record oauth attempt event:',
          error instanceof Error ? error.message : String(error),
        );
      }
    };

    const completeWithError = async (
      authMessage: string,
      failureCategory: OAuthAttemptFailureCategory,
      callbackErrorCode?: string,
    ) => {
      if (cancelled) return;
      setStatus('error');
      setMessage(authMessage);
      await recordAttemptEvent({
        event: 'failed',
        result: 'login_error',
        failureCategory,
        callbackErrorCode,
      });
      clearStoredOAuthAttempt();
      navigate(encodeLoginError(authMessage), { replace: true });
    };

    const finish = async () => {
      try {
        await recordAttemptEvent({ event: 'callback_received' });

        const callbackError = readCallbackError();
        if (callbackError) {
          await completeWithError(
            callbackError.message,
            'callback_error',
            callbackError.code ?? undefined,
          );
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          await completeWithError('No session found. Please sign in again.', 'no_session');
          return;
        }

        setStatus('ok');
        setMessage('Signed in. Redirecting...');
        await recordAttemptEvent({ event: 'session_detected' });

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', data.session.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        const profileState: OAuthAttemptProfileState = profile?.display_name ? 'present' : 'missing';
        await recordAttemptEvent({
          event: profileState === 'present' ? 'profile_present' : 'profile_missing',
          profileState,
        });

        const result: OAuthAttemptResult = profileState === 'present' ? 'app' : 'welcome';
        const destination = result === 'welcome' ? '/auth/welcome' : nextPath;
        await recordAttemptEvent({
          event: 'completed',
          result,
          profileState,
        });
        clearStoredOAuthAttempt();
        navigate(destination, { replace: true });
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        const failureCategory: OAuthAttemptFailureCategory =
          messageText.toLowerCase().includes('profile') ? 'profile_lookup_failed' : 'unexpected';
        await completeWithError(messageText, failureCategory);
      }
    };

    const timer = window.setTimeout(() => {
      if (!cancelled) void finish();
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
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
