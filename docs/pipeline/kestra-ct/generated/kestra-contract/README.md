# Kestra Contract Types

These files are the CT-side Task 6 staging artifacts for Kestra API contract typing.

## Source Of Truth

- OpenAPI file: `/home/jon/blockdata/openapi.yml`
- Generation date: `2026-03-09`
- Tool: local `@hey-api/openapi-ts` from `/home/jon/blockdata/web-kt`

## Generation Command

```bash
cd /home/jon/blockdata/web-kt
npx openapi-ts -i ../openapi.yml -o ../kestra-ct/generated/kestra-contract -p @hey-api/typescript
```

## Output

- `index.ts`
- `types.gen.ts`

The output is intentionally types-only for backend preparation work. It does not include the frontend SDK or client layer.

## Refresh Policy

Regenerate from the same root `openapi.yml` whenever the Kestra contract source changes or before promoting these artifacts into runtime paths.

## Later Promotion Target

After the preparation gate is approved, promote this CT-side staging output into:

- `/home/jon/blockdata/supabase/functions/_shared/kestra-contract/`

Do not promote these files during the preparation phase.
