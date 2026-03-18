-- Migration 100: Seed superuser profile for primary operator
-- Also ensures the default project migration (099) backfill covers this user.

INSERT INTO public.registry_superuser_profiles (email, display_name, notes)
VALUES ('jondev717@gmail.com', 'Jon', 'Primary operator — seeded on project bootstrap')
ON CONFLICT (email_normalized) DO NOTHING;