CREATE TABLE IF NOT EXISTS public.user_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NULL,
  value_encrypted TEXT NOT NULL,
  value_suffix TEXT NULL,
  value_kind TEXT NOT NULL DEFAULT 'secret',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_variables_user_id_name_lower_idx
  ON public.user_variables (user_id, lower(name));

CREATE INDEX IF NOT EXISTS user_variables_user_id_idx
  ON public.user_variables (user_id);

ALTER TABLE public.user_variables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_variables_select ON public.user_variables;
DROP POLICY IF EXISTS user_variables_insert ON public.user_variables;
DROP POLICY IF EXISTS user_variables_update ON public.user_variables;
DROP POLICY IF EXISTS user_variables_delete ON public.user_variables;

CREATE POLICY user_variables_select
  ON public.user_variables
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_variables_insert
  ON public.user_variables
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_variables_update
  ON public.user_variables
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_variables_delete
  ON public.user_variables
  FOR DELETE
  USING (auth.uid() = user_id);
