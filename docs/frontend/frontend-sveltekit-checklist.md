# Frontend Migration Checklist: Next.js → SvelteKit (`frontend/`)

Status date: 2026-02-03  
Goal: Replace the current Next.js UI with a faster, simpler SvelteKit frontend while preserving the product shape (public marketing + auth-gated dashboard) and keeping the backend anchored on Supabase (Auth + Postgres + Edge Functions).

**Golden rule:** No “tribal knowledge.” Every non-obvious decision or gotcha must be captured in `docs/dev-plan/frontend-migration-sveltekit.md` and `docs/refs/frontend-stack-decision.md`.

---

## 0) Scope + folder layout (decide up front)

- [x] Create new dedicated frontend directory: `frontend/`
- [x] Remove existing Next.js UI (`ui/`) once SvelteKit exists (completed on 2026-02-03)

---

## 1) Documentation deliverables (must ship with the change)

- [ ] Update: `docs/dev-plan/core-pipeline-status-and-plan.md` (Frontend Stack section: what changed, why)
- [ ] New: `docs/dev-plan/frontend-sveltekit-migration.md` (step-by-step log + rollout/rollback plan)
- [ ] New: `docs/refs/frontend-stack-decision.md` (ADR-style decision + non-goals + constraints)
- [ ] New: `docs/dev-plan/frontend-runbook.md` (env vars, local dev, deploy, troubleshooting)
- [ ] New: `docs/dev-plan/frontend-routes-and-flows.md` (public vs app routes + auth gating + screen→Edge Function map)

---

## 2) Scaffold SvelteKit (`frontend/`)

- [x] Initialize SvelteKit in `frontend/` (Vite-based)
- [ ] Add TypeScript
- [ ] Add Tailwind (if using)
- [ ] Add lint/format (match repo style; keep minimal)
- [x] Ensure `frontend/README.md` explains: install, dev, build, preview

---

## 3) Environment + configuration (Supabase-first)

- [ ] Define required env vars for local + prod
  - [ ] `PUBLIC_SUPABASE_URL`
  - [ ] `PUBLIC_SUPABASE_ANON_KEY`
  - [ ] Any other public config needed by the browser
- [ ] Define server-only env vars (no `PUBLIC_` prefix)
- [ ] Document env vars in `docs/dev-plan/frontend-runbook.md`

---

## 4) Auth model + route protection

Target behavior:
- Public pages are accessible without auth.
- `/app/*` requires an authenticated session and redirects to `/login` when missing.

- [ ] Pick auth model:
  - [ ] SSR-aware (recommended): cookies/session integrated with SvelteKit server hooks
  - [ ] Client-only (allowed, but document trade-offs)
- [ ] Implement route guard for `/app/*`
- [ ] Implement logout + session refresh behavior
- [ ] Document “how auth works” (where the guard lives, what it checks, redirect rules)

---

## 5) Public marketing routes

- [ ] `/` (landing)
- [ ] `/pricing`
- [ ] `/how-it-works`
- [ ] Confirm static/prerender approach (document what is prerendered)

---

## 6) Dashboard routes (minimum viable)

Minimum dashboard-first flow (adjust if your product naming differs):
- [ ] `/app` (dashboard home)
- [ ] Documents list (view existing docs)
- [ ] Upload / ingest entry point (calls existing Edge Function)
- [ ] Document detail page (status: converting/ingested/failed)
- [ ] Blocks view (render blocks from Postgres/API)
- [ ] Export JSONL (calls existing Edge Function)

---

## 7) Edge Function integration map

- [ ] For each screen, list which endpoint it calls:
  - [ ] ingest
  - [ ] export-jsonl
  - [ ] any list/get/status endpoints
- [ ] Confirm error handling patterns are consistent (toast, inline, etc.)

---

## 8) Build + deployment

- [ ] Decide hosting mode:
  - [ ] Static hosting (SPA) + Supabase backend
  - [ ] SSR hosting (adapter) + Supabase backend
- [ ] Add deploy instructions to `docs/dev-plan/frontend-runbook.md`
- [ ] Confirm prod build works locally (`build` + `preview`)

---

## 9) Cutover + rollback

- [ ] Define the cutover steps (what changes for users/URLs)
- [ ] Add rollback plan (if needed, restore from git history only)

---

## 10) Acceptance checks (before calling it done)

- [ ] Public pages render correctly
- [ ] `/app/*` redirects to `/login` when logged out
- [ ] Login works; session persists across refresh
- [ ] Upload/ingest works end-to-end (at least `.md`, ideally one non-md once conversion service is wired)
- [ ] Export JSONL works from dashboard
- [ ] Docs listed in Section 1 are updated/created and accurate
