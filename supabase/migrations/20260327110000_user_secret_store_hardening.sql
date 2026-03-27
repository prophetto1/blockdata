-- Canonicalize the physical secret store without renaming the table.
UPDATE public.user_variables
SET name = upper(name)
WHERE name <> upper(name);

-- Route-only secret storage: browsers should not read or mutate rows directly.
REVOKE ALL ON TABLE public.user_variables FROM anon;
REVOKE ALL ON TABLE public.user_variables FROM authenticated;

-- Service-role access remains available for platform-api.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_variables TO service_role;

COMMENT ON TABLE public.user_variables IS
  'Physical encrypted secret store backing the canonical Secrets product/API surface. Names are canonicalized to uppercase by migration and route writes.';

COMMENT ON COLUMN public.user_variables.name IS
  'Canonical uppercase secret name used by the /secrets and deprecated /variables API surfaces.';

COMMENT ON COLUMN public.user_variables.value_encrypted IS
  'Encrypted secret payload. The hardening migration canonicalizes metadata names only and does not rewrite ciphertext.';
