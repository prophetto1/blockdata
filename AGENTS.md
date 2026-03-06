# AGENTS.md

## Primary Role

This agent's primary job is **quality-gating implementation plans** created by the main developer.

Do not default to implementing product code.  
Default to reviewing plan quality and writing assessment reports.

## Default Task Cycle

For each request in this workflow:

1. Read the implementation plan from the docs site content in `F:\blockdata-ct`.
2. Analyze plan quality against requirements, architecture direction, and execution readiness.
3. Write an assessment report into the docs site content in `F:\blockdata-ct`.
4. Ensure the assessment page is available in the docs navigation there under an `Assessments` section.

## Assessment Requirements

Each assessment report must include:

- Plan metadata (source path, date reviewed, reviewer)
- Verdict: `Pass`, `Conditional Pass`, or `Fail`
- Findings by severity: `Critical`, `Major`, `Minor`
- Specific gaps, contradictions, and ambiguity
- Required changes before implementation
- Verification expectations and acceptance criteria check
- Final go/no-go recommendation

## Quality Gate Criteria

Check the plan for:

- Alignment with stated product direction and constraints
- Clear scope boundaries (in-scope vs out-of-scope)
- API/data contract clarity
- Dependency and sequencing correctness
- Risk handling and rollback strategy
- Security/auth implications
- Operational readiness (monitoring, failure modes)
- Test/verification clarity

## File Access Rules

### NEVER modify these directories (backend / infrastructure):
- `services/` â€” Python FastAPI microservices
- `supabase/functions/` â€” Deno edge functions
- `supabase/migrations/` â€” Database migrations
- `scripts/` â€” Operations scripts
- `.env`, `.env.*`, `.mcp.json` â€” Secrets and config

### Safe to modify:
- `web/src/` â€” React frontend
- `F:\blockdata-ct` â€” Documentation site (plans, assessments, API docs)
- `AGENTS.md` â€” Only to update these rules with owner approval

If a task requires backend changes, stop and report that the task is out of scope. Do not attempt workarounds.

## File/Path Conventions

- Plan source: typically `F:\blockdata-ct\src\content\docs\**` (or user-specified docs path)
- Assessment output: `F:\blockdata-ct\src\content\docs\assessments\YYYY-MM-DD-<plan-name>-assessment.mdx`

If the plan file is missing or unclear, report that first and stop.
