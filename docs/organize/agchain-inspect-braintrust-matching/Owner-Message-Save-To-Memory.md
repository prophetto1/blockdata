

the surfaces as artifact viewers for Legal-10. But what you're actually describing is the opposite direction: the surfaces need to be composable registries that benchmark authoring draws from.

The difference matters enormously:

Artifact viewer model (what the direction doc mostly proposes):


Legal-10 exists → surfaces display its files
Registry composition model (what you're asking for):


Registries exist → benchmark author composes from them → Legal-10 is just one package that was authored this way
In the second model, if someone wants to create "Cyber-5" or "Finance-12" tomorrow, they don't need to write Python files and build scripts. They use the platform:

Datasets — register data sources, samples, field mappings. A benchmark step says "use dataset X, samples matching filter Y"
Scorers — register scoring functions (deterministic or judge). A benchmark step says "score with scorer_ref Z"
Prompts — register prompt templates with named placeholder slots. A benchmark step says "use prompt template P, fill slots from payload"
Parameters (Environment Profiles) — compose session strategy + state provider + tool strategy + constraints. A run says "execute under profile E"
Models — already a registry. A benchmark says "evaluate against these model targets"
Tools — register tool capabilities with contracts. An environment profile says "allow tools T1, T2"
Runs — execute: benchmark × model × environment profile
Results — the three-axis comparison output
The Inspect AI reference validates this exact pattern — everything is a named, registered, composable object (@scorer, @tool, @solver, @sandboxenv, @modelapi). And inspect_cyber shows how a domain package composes from those registries without reimplementing any of them.

What this means for the platform surfaces
Each surface needs three things to be a real registry that benchmarks compose from:

Surface	Registry Object	Create/Edit Contract	Referenced By
Datasets	Dataset version (samples, field spec, loader config)	Name, source type, field mapping, sample preview	Benchmark step inject_payloads
Scorers	Scorer definition (mode, parameters, rubric)	Name, scoring_mode, parameter schema, judge prompt (if judge)	Benchmark step scorer_ref
Prompts	Prompt template (slots, output contract, guard)	Name, template body, placeholder declarations, output_contract	Benchmark step prompt_ref (new field)
Parameters	Environment Profile (session + state + tools + constraints)	Composer UI: pick strategy per axis, set limits	Run config profile_id
Tools	Tool definition (contract, sandbox requirement)	Name, parameter schema, sandbox_required flag	Environment Profile tool_strategy
Models	Model target (already done)	Already done	Benchmark model_targets, Run config
The benchmark step editor already has scorer_ref, scoring_mode, inject_payloads, judge_prompt_ref, output_contract, and step_config. These are the binding points — they're currently free-text fields, but they should resolve against the registries above.

The interoperation spine
The composition flow is:


Datasets ──→ Benchmark Step (inject_payloads references dataset samples)
Prompts  ──→ Benchmark Step (prompt template + slot bindings)
Scorers  ──→ Benchmark Step (scorer_ref resolves to registered scorer)
Tools    ──→ Environment Profile (tool_strategy references registered tools)
Models   ──→ Benchmark (model_targets) + Run (evaluated_model, judge_model)
Profiles ──→ Run (runtime_policy_bundle identity)
                    ↓
              Results (three-axis: Benchmark × Model × Profile)
What already exists that supports this
The backend benchmark step schema already has the binding fields. The profiles/ Python code already has the registry pattern with register_*() and resolve_profile(). The Inspect AI reference shows the decorator-based registry (@scorer, @tool) that makes everything discoverable by name.

What's missing is:

Backend CRUD endpoints for each registry (datasets, scorers, prompts, tools, profiles)
Frontend registry surfaces with create/edit forms
Binding resolution in the benchmark step editor — scorer_ref becomes a dropdown populated from the Scorers registry, inject_payloads becomes a dataset picker, etc.
The build sequence that enables this
The direction doc's "Phase 1: stop the lying" is right about urgency but wrong about shape. Instead of building artifact viewers, each surface should be a thin registry from day one:

Wave 1 — Registries that benchmark steps already bind to:

Scorers — the step editor already has scorer_ref and scoring_mode. Build the registry, populate it from Legal-10's proven scorers, make scorer_ref a resolved reference.
Prompts — the step editor has judge_prompt_ref. Build prompt template registry, populate from Legal-10 model_steps/judge_prompts, add prompt_ref to steps.
Wave 2 — Registries that runs bind to:

Environment Profiles (Parameters) — profiles/ Python code exists. Build CRUD endpoints, build the composer UI. Runs reference profile_id.
Runs — now that profiles are real, runs compose benchmark + model + profile.
Wave 3 — Registries that complete the composition:

Datasets — register data sources, benchmark steps reference them for payload injection.
Results — the three-axis comparison surface that consumes run outputs.
Tools — registry for tool definitions, environment profiles reference them.
This way Legal-10 becomes the seed data that populates the registries on first use, but the registries themselves are the product — any new benchmark authored through the platform gets the same composition capabilities without writing Python.

The first thing to do is figuring out how to properly restore the code we have in agchain and surface them again as menus in the frontend so that we can start building towards a working product; but there are gaps in the code as well; the important thing is 
- inspect-ai is a reference/benchmark for us when it can be. It does most things well and for areas it does well, we want to utilize it as a base/standard. 
- there are areas that are weak in inspect-ai - for these areas, if our plan for a feature far exceededs the level of detail or depth that inspect-ai has, there are likely two paths for this. 
  1. if inspect-ai scope of this feature can be utilzied as an intermediary basis, so that we can build our planned feature on top; then the development should be develope inspect-ai compatible build of this feature first, then build our plannbed funcitonalities on top 
2. if our planned direction for a feature is a drastically and fundamentally different direction; then plan and build our functionalities directly; BUT first check to see if braintrust (which does not open its backend or src code) but only its frontend which we can visually see through the platform website - see if they offer any guidance on how to build it out. 
if they do, show visually something that lcosely aligns with our implementation plan for a feature; use their visual frontend as a gudie by porting or desgining something similar so that our development of the backend without any direct src code to guide the implementation can still be guided by something. 