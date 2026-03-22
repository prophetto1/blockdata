# Fix: Capture server ENOENT + zombie auth-needed status

## Context

The Design Layout Captures feature has two bugs:

1. **ENOENT on long URLs:** `deriveCaptureSlug()` includes ALL query parameter keys and values in the directory slug. URLs with many/long query params (e.g., UTM-heavy marketing URLs) produce slugs that exceed Windows' 260-char MAX_PATH, causing `fs.mkdirSync` to throw ENOENT.

2. **Zombie "auth-needed" status:** A previous code version could set `auth-needed` status, but that code path was removed. Entries stuck in this status can never be resolved — the current server only sets `pending`, `capturing`, `complete`, or `failed`.

The `localhost:8080/signup` failure is expected behavior (target server not running), not a bug.

## Root Cause Trace

### Bug 1: ENOENT

```
User submits URL with query params
  → capture-server.mjs:163 calls deriveCaptureSlug(url)
    → measure-layout.mjs:90-96 iterates ALL url.searchParams, appends keys AND values
      → slug = "reducto-ai-utm-content-777921860384-utm-term-reducto-..." (~350 chars)
  → capture-server.mjs:164 calls deriveDefaultOutputDir()
    → measure-layout.mjs:104 builds: docs/design-layouts/{350-char-slug}/1920x1080
  → measureLayout() at line 1029 calls ensureDir(outputDir)
    → fs.mkdirSync fails: full path ~400 chars > Windows 260-char MAX_PATH
      → ENOENT thrown
```

### Bug 2: auth-needed zombie

```
captures.json contains entries with status: "auth-needed"
  → readCaptures() (capture-server.mjs:58-66) only overrides "complete" → "failed"
  → "auth-needed" passes through unchanged
  → No code path can transition it to any other state
  → Entries are permanently stuck
```

## Manifest

### Platform API

No platform API changes. This is a local dev-tool capture server (`scripts/capture-server.mjs`) and a Playwright skill script — neither touches the platform API.

### Observability

No observability changes. This is a local dev tool. The capture server already logs capture starts, completions, and failures to stdout via `console.log`/`console.error`. No traces, metrics, or structured logs are warranted for a localhost-only debugging utility.

### Database Migrations

No database migrations. The capture server stores data in a flat JSON file (`docs/design-layouts/captures.json`), not in Supabase.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New pages:** 0
**New components:** 0
**New hooks:** 0
**New libraries/services:** 0

**Modified files:** 3

| File | What changes |
|------|-------------|
| `docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs` | `deriveCaptureSlug()` — strip query params from slug, add 180-char max-length truncation |
| `scripts/capture-server.mjs` | `readCaptures()` — normalize zombie `auth-needed` status to `failed` on read |
| `docs/design-layouts/captures.json` | Delete 4 broken test entries (localhost:8080, reducto.ai plain, both long-URL reducto) |

## Implementation

### Task 1: Fix `deriveCaptureSlug` — strip query params, add length cap

**File:** `docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs` (lines 70-100)

Remove the query-parameter loop (lines 90-94) that appends every `searchParams` key and value to the slug. Only derive from hostname + pathname segments. Add a 180-char max-length truncation as a safety net for extremely long pathnames.

```javascript
export function deriveCaptureSlug(input) {
  if (!input) return "capture";

  if (/^https?:\/\//i.test(input) || /^file:\/\//i.test(input)) {
    const url = new URL(input);

    if (url.protocol === "file:") {
      const filePath = fileURLToPath(url);
      return sanitizePathSegment(path.basename(filePath, path.extname(filePath)));
    }

    const hostname = sanitizePathSegment(url.hostname);
    const pathSegments = url.pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => sanitizePathSegment(segment))
      .filter(Boolean);

    let slug = [hostname, ...pathSegments].filter(Boolean).join("-");

    // Truncate to prevent Windows MAX_PATH issues.
    // Budget: repo root (~40) + "docs/design-layouts/" (19) + "/WIDTHxHEIGHT" (13) = ~72 chars overhead.
    const MAX_SLUG_LENGTH = 180;
    if (slug.length > MAX_SLUG_LENGTH) {
      slug = slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, "");
    }

    return slug;
  }

  return sanitizePathSegment(path.basename(input, path.extname(input)));
}
```

### Task 2: Normalize zombie `auth-needed` status in `readCaptures()`

**File:** `scripts/capture-server.mjs` (lines 58-66)

In the `.map()` callback that already overrides `complete` → `failed` when outputDir is missing, add a prior check: if `entry.status === "auth-needed"`, normalize to `"failed"`.

```javascript
status:
  entry.status === "auth-needed"
    ? "failed"
    : entry.status === "complete" &&
        (typeof entry.outputDir !== "string" ||
          !fs.existsSync(path.join(capturesRoot, entry.outputDir.replace(/\\/g, "/"))))
      ? "failed"
      : entry.status,
```

### Task 3: Clean up broken entries in captures.json

**File:** `docs/design-layouts/captures.json`

Delete these 4 entries (test captures with no artifacts):

| id | reason |
|----|--------|
| `localhost-signup--1920x1080--light--dashboard` | target server not running, no useful data |
| `reducto-ai--1920x1080--light--marketing` | zombie auth-needed, no artifacts |
| `reducto-ai-utm-content-...--1920x1080--light--marketing` | ENOENT from long slug, no artifacts |
| `reducto-ai-utm-content-...--1920x1080--light--settings` | ENOENT from long slug, no artifacts |

## Verification

1. Restart capture server: `npm run capture-server`
2. Open the Layout Captures page in the UI
3. Confirm the 4 broken entries are gone
4. Confirm existing captures (botpress, gumloop, studio) still display with correct previews
5. Click "Add New" and capture `https://reducto.ai/?utm_content=777921860384&utm_term=reducto&utm_device=c&utm_network=g&campaignid=23097717334&adgroupid=190295734687&adid=777921860384&utm_term=reducto&utm_campaign=defense&utm_source=google&utm_medium=cpc&gad_source=1&gad_campaignid=23097717334&gclid=CjwKCAjwg_nNBhAGEiwAiYPYA1zit5KNPhoD-RdWl87OM0Vru635s6rmT0mjOkKd0s3DTA7oFMrnbRoCyYoQAvD_BwE` at 1920x1080 light
6. Confirm it succeeds with a short slug (`reducto-ai`), not the full query-param explosion
7. Confirm the new entry shows status `complete` with a preview thumbnail
