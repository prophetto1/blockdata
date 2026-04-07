# Legal-10 Website — Complete Inventory

**Generated:** 2026-03-30
**Source:** `_agchain/legal-10/website/`

---

## Stack

- **Pure static HTML** — no build system, no NPM, no Node.js required
- **Styling:** Tailwind CSS via CDN
- **JavaScript:** Vanilla ES6+ (no framework)
- **Layout:** Custom shell system (`site-shell.js` injects nav/layout at runtime)
- **Data:** Dual-mode (static JSON files OR Supabase PostgREST API)
- **Grid:** AG Grid Community v34.3.1 (leaderboard tables)
- **Dev server:** Python `http.server` on port 3000
- **Database (optional):** Supabase PostgreSQL (schema in `schema_ref.sql`)

---

## Pages (90 HTML files)

### Root
- `index.html` — Homepage (hero, status bar, leaderboard preview, notices)

### Methodology (61 pages)
6-pillar framework:
1. **Data & Corpus** (10 pages): case-universe, cap-metadata, fowler-authority, k-rule, data-inventory, stages 1-3
2. **Evaluation Pipeline** (11 pages): chained-evaluation, stateful-delivery, atomic-skills, runner-semantics, closed/open-book
3. **Scoring & Judging** (8 pages): hybrid-scoring, chain-consistency, deterministic, judge-policy, composite, citation-integrity-gate
4. **Artifacts & Reproducibility** (5 pages): evaluation-units, research-packs, contracts-schemas, frozen-context, run-artifacts
5. **Validation Checks** (3 pages): canary-depth, synthetic-traps, evaluation-observability
6. **Quantization & Reasoning** (4 pages): ptq-methods, stacking-problem, precision-tier-evaluation

### Benchmarks (6 pages)
L7, Atomic, Agentic, Bit-Precision, Roadmap

### Leaderboard (3 pages)
Main table + charts/analysis + deep dive metrics

### Reports (5 pages)
Research reports, empirical design, sample templates

### About (5 pages)
Mission, donate, contact, notices

### Pitch Deck (2 pages)
Interactive deck (Next.js pre-built export)

### Developers (1 page)
Onboarding links to GitHub, Hugging Face, schemas

---

## Data Sources

Static JSON in `/public/data/`:
- `leaderboard-l10-core.sim.json` — 200 instances, 5 models (Claude 3.5 Sonnet, GPT-4o, o1, Gemini 1.5 Pro, Llama 3.1 405B)
- `leaderboard-l10-full.sim.json` — Extended metrics
- `leaderboard-ag10.sim.json` — AG10 variant
- `run-specs.json` — Dataset registry (3 runspec variants)
- `notices.json` — Notification board

Dual-mode loader (`data-client.js`): reads JSON locally or queries Supabase `public_leaderboard_latest_v1` view.

---

## Database Schema (schema_ref.sql)

4 tables:
- `models` — LLM registry (name, provider, api_model_id, parameters, context_window, quantization)
- `runs` — Benchmark executions (model_id, benchmark_version, dataset_version, spec_hash, status, langfuse_trace_id)
- `run_scores` — Per-run scores (s1-s8, chain_score, voided flag)
- `reports` — Editorial/research content (title, slug, markdown content, status)

---

## Scripts

| Script | Purpose |
|--------|---------|
| `dev.py` | Local dev server (port 3000) |
| `validate_site_html.py` | HTML linter |
| `generate_sitemap.py` | Auto-generates sitemap.xml |
| `generate_tree.py` | Generates repo structure doc |
| `export_db_schema.py` / `v2` | Database introspection |
| `seed_supabase_from_leaderboard_json.py` | JSON → Supabase migration |
