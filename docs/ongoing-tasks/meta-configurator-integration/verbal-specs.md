# Schema Builder Co-Pilot — Verbal Specs

**Spec authority (v0):** `docs/ongoing-tasks/meta-configurator-integration/spec.md`

## Core Concept

> This should be part of the schemas menu — where users can upload pre-designed
> JSON schemas or use this to create the JSON schemas.

The Schemas menu supports two workflows:

1. **Upload** — users upload pre-designed JSON schemas
2. **Create with AI** — users build schemas interactively with the platform co-pilot

## Two Distinct AI Systems

> The AI models — there are two types of AI models we support.

### 1. User-Provided LLM Keys (Settings page)

> The ones that the users connect API keys to do the runs — the actual
> annotations onto already created user schemas.

- User connects their own API keys (Anthropic, OpenAI, Google, etc.)
- These power **annotation runs** — AI processing of blocks against existing schemas
- Already built. Separate concern from the co-pilot.

### 2. Platform-Provided Co-Pilot

> The other model/AI they use is the one we provide internally — integrated
> into the system — the model trained to provide highly specialized assistance
> in creating schemas by asking questions, etc. This model is a co-pilot or
> browser-end extension that is integrated into our platform that the user
> chats with that can create and save schemas for users.

- Internally integrated, platform-wide — not limited to a single page
- The Schemas page is one surface where it operates (schema creation/editing)
- Trained to provide highly specialized assistance in creating schemas
- Asks questions, iterates on drafts, generates and saves schemas
- Acts as a co-pilot or browser-end extension
- The user chats with it; it creates and saves schemas for them

#### Model & Knowledge

> Most likely Opus or Gemini Pro. Everything it knows will be 100% about
> the platform and how to do everything on it. I am going to train it with
> KGs and vector and serve it behind an MCP.

- Powered by Opus or Gemini Pro (platform pays)
- 100% platform-aware — knows the platform's schema rules, block types, pairing rules, everything
- Trained with knowledge graphs and vector embeddings
- Served behind an MCP server

#### v0 vs future

- **v0 (this build):** a minimal, platform-provided `schema-assist` capability scoped to schema creation/editing (field suggestions, prompt drafting, schema modifications, Q&A).
- **Future:** the platform-wide Co-Pilot (KG/vector trained, MCP-served) that is not limited to the Schemas surface.

### The distinction

These two AI systems do not share keys, models, or infrastructure. User API keys
power annotation runs. The platform co-pilot is a separate system the platform
provides and pays for.

---

## Design Decisions

| Decision | Answer | Notes |
|---|---|---|
| Where does the co-pilot live? | On the platform — the Schemas page is one surface | Platform-wide assistant; schema creation is one of its capabilities |
| What model powers it? | Most likely Opus or Gemini Pro | Platform-provided, platform pays |
| Should it know platform rules? | 100% about the platform | Trained with KGs and vectors, served behind an MCP |

| How should users refine schema drafts? | Visual field list as primary view, JSON tab for power users | Domain experts are the primary audience, not developers |
