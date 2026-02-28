-- Assistant chat: threads + messages for the AI assistant pane

CREATE TABLE IF NOT EXISTS public.assistant_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  model TEXT,
  context_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.assistant_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_thread
  ON public.assistant_messages(thread_id, created_at);

CREATE INDEX IF NOT EXISTS idx_assistant_threads_user
  ON public.assistant_threads(user_id, updated_at DESC);

-- RLS
ALTER TABLE public.assistant_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY assistant_threads_select ON public.assistant_threads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY assistant_threads_insert ON public.assistant_threads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY assistant_threads_update ON public.assistant_threads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY assistant_threads_delete ON public.assistant_threads
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY assistant_messages_select ON public.assistant_messages
  FOR SELECT TO authenticated
  USING (thread_id IN (SELECT id FROM public.assistant_threads WHERE user_id = auth.uid()));
CREATE POLICY assistant_messages_insert ON public.assistant_messages
  FOR INSERT TO authenticated
  WITH CHECK (thread_id IN (SELECT id FROM public.assistant_threads WHERE user_id = auth.uid()));

-- Privileges
REVOKE ALL ON TABLE public.assistant_threads FROM anon, authenticated;
REVOKE ALL ON TABLE public.assistant_messages FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_threads TO authenticated;
GRANT SELECT, INSERT ON TABLE public.assistant_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_threads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_messages TO service_role;
