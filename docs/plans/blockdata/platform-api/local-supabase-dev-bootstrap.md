# Local Supabase Dev Bootstrap

This repo already has the Supabase local-dev structure:

- [supabase/config.toml](/E:/writing-system/supabase/config.toml)
- [supabase/migrations](/E:/writing-system/supabase/migrations)
- [supabase/functions](/E:/writing-system/supabase/functions)

What was missing was a repo-owned bootstrap path for starting and verifying that stack locally.

## Script

Use:

```powershell
.\scripts\supabase-local.ps1
```

Default behavior:

- checks that `npx` exists
- checks that Docker is reachable
- checks whether the local Supabase stack is already running
- starts the stack with `npx supabase start` if needed
- prints the CLI output directly

## Common Commands

Start or ensure the local stack is running:

```powershell
.\scripts\supabase-local.ps1
```

Check status only:

```powershell
.\scripts\supabase-local.ps1 -Status
```

Start the stack if needed and then reset the local database:

```powershell
.\scripts\supabase-local.ps1 -Reset
```

Stop the local stack:

```powershell
.\scripts\supabase-local.ps1 -Stop
```

## Failure Modes

If Docker is not reachable, the script stops early with a clear error.

If `supabase start` hits Docker Hub pull-rate limiting, the script stops with the specific instruction to run:

```powershell
docker login
```

Then rerun:

```powershell
.\scripts\supabase-local.ps1
```

## AG chain Use

For AG chain work that adds or verifies Supabase migrations, the expected local verification path is:

```powershell
.\scripts\supabase-local.ps1 -Reset
```

That keeps AG chain on the existing Supabase backend model without introducing a second custom Docker Compose stack.
