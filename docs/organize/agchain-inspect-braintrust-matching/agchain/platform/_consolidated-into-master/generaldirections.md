Investigation Findings: AG Chain Benchmark Runner Platform
What Legal-10 Actually Is (From Code, Not Just Docs)
A working 3-step benchmark kernel with ~3,200 lines of proven Python:

Component	File	Lines	Status
Runner	runspecs/3-STEP-RUN/run_3s.py	465	Proven by real Claude run
Benchmark Builder	runspecs/3-STEP-RUN/benchmark_builder.py	449	Functional
InputAssembler	runtime/input_assembler.py	133	Functional
PayloadGate	runtime/payload_gate.py	30	Functional
CandidateState	runtime/state.py	67	Functional
Audit	runtime/audit.py	69	Functional
Model Adapters	adapters/model_adapter.py	125	OpenAI + Anthropic
d1 Scorer	scorers/d1_known_authority_scorer.py	254	Functional
Citation Integrity	scorers/citation_integrity.py	258	Functional
EU Builder	scripts/eu_builder.py	396	Functional
RP Builder	scripts/rp_builder.py	840	Functional
Plus a 10-step chain specification with all 10 FDQs complete, a 4-tier state provider architecture (Type 0 active, Types I-III specified), and ~70 docs.

Existing Platform Understanding Dossier
The dossier at 2026-03-26-agchain-platform-understanding.md is already excellent and aligns with everything I found. It correctly identifies the three-layer separation: writing-system (host) > AG chain (platform) > Legal-10 (package).

What the AG Chain Shell Should Surface
Based on deep reading of all specs, runtime code, and your updated direction, the side rail needs 8 primary sections covering both benchmark authoring/building AND execution/inspection:

Rail Section	What It Covers	Why It's Critical
Dashboard	Recent runs, active benchmarks, quick-launch	Entry point + at-a-glance status
Benchmarks	Registry, package management, step definitions, plan editor, scorer config	Benchmark authoring surface
Runs	Queue, active, completed, failed, comparisons, saved profiles	Execution + inspection surface
Datasets	EU browser, RP inspector, payload viewer	Data inspection for authoring
Models	Target registry, API connections, provider config, model selection	Required: models must be selectable through the platform
Observability	Run traces, step events, provider metrics, audit correlation	Required: OTel showing everything internally
Builder	EU builder, RP builder, benchmark materializer, run from builder	Authoring pipeline surface
Settings	Context delivery policies, tool provision config, runtime defaults	Required: platform flexibility for all configs
Critical functionalities you flagged that the dossier mentions but doesn't detail:

Context Delivery Configuration -- the statefulness doc specifies 4 state provider types + 2 session strategies (Replay_Minimal, Replay_Full). Your updated requirements add: per-step API call option (prevents EM from seeing future context), single-call option, and platform-controlled context preservation. This becomes a first-class configuration surface.

Tool Provision for Evaluated Models -- not currently in the specs at all. This is new: the platform provides tools (internet, skills, APIs) that the evaluated model can use during execution. This is an extension beyond the current "sealed bytes only" model.

Model Selection -- currently hard-coded CLI args. Needs to become a persistent registry with provider/model/API-key-ref/base-url, similar to how the existing superuser AI Providers page works.

Run Profiles -- saved configurations so the same benchmark can be re-run on new models with one click.

Where Files Live
Following the admin shell pattern exactly:

Shell: web/src/components/layout/AgchainShellLayout.tsx (sibling to AdminShellLayout)
Nav: web/src/components/agchain/AgchainLeftNav.tsx
Pages: web/src/pages/agchain/*.tsx (lazy-loaded)
API client: web/src/lib/agchainApi.ts
Backend routes: services/platform-api/app/api/routes/agchain_*.py
Backend domain: services/platform-api/app/domain/agchain/
Database: New migration supabase/migrations/YYYYMMDD_agchain_core.sql
Access Control Decision
Per your direction: no additional guard beyond AuthGuard. Any authenticated user can access /app/agchain/*. This is consistent with the intent to eventually extract this as its own repo -- it's independent functionality, not superuser-specific.

Key Architecture Decision: Runtime Integration
The current run_3s.py calls model APIs directly from Python CLI. To move this into platform-api:

Port runner kernel into services/platform-api/app/domain/agchain/runner.py -- preserving the exact execution semantics (PayloadGate, InputAssembler, CandidateState sanitization, Audit)
Model adapters become a platform service that reads API keys from agchain_model_targets table (not env vars)
Run execution triggered via POST /agchain/runs endpoint, initially synchronous per-EU, then async via the existing platform-api worker pattern
Run artifacts (run.jsonl, audit_log.jsonl, summary.json) stored in a platform-managed location (GCS or local runs/ depending on environment)
OTel instrumentation wraps every runner operation using the exact patterns from services/platform-api/app/observability/otel.py
Proposed Phasing
Phase 1 (this plan): Shell + Core API + Database + Basic Run Execution + OTel

AgchainShellLayout in router
13 platform-api endpoints
5 database tables
Runner kernel ported with OTel
7 frontend pages
Basic model target management
Phase 2 (follow-on): Context Delivery Config + Tool Provision + Run Comparison

Context delivery mode UI (per-step vs single-call, replay modes)
Tool provision framework (platform-provided tools for EMs)
Run comparison / leaderboard views
Run profiles UI
Phase 3 (follow-on): Benchmark Authoring + Full 10-Step Chain

Step definition editor
Prompt template editor
Scorer binding configuration
Full 10-step chain support
Bundle sealing
Before I write the full plan with locked manifests and implementation tasks, do these findings and the proposed surface/phasing match your intent? Any sections to add, remove, or reprioritize?

