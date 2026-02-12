# Future Task: Schema Library + AI Assistant for User-Defined Schemas

**Filed:** 2026-02-12  
**Status:** Future task (not in current execution queue)  
**Type:** Product-spec direction (prescriptive)

---

## Why this exists

User-defined schemas are powerful but still high-friction when users start from a blank page.

The target experience is:
1. Start from a curated schema library for common use cases.
2. Use an AI assistant to adapt that starting schema to the user's project and documents.
3. Save as a project-owned schema copy that is safe to customize.

This turns schema design from "author from scratch" into "select + adapt + validate".

---

## North-star behavior

On the Schemas workflow, users can:

1. Browse a **Schema Library** of pre-defined templates.
2. Open each template and view:
   - purpose and best-fit use cases,
   - field-by-field explanation,
   - sample output shape,
   - constraints and notes.
3. Choose one of two apply actions:
   - **Apply to existing project**
   - **Apply to new project**
4. Launch an **AI assistant** to adapt the selected schema:
   - propose field edits/additions/removals,
   - draft or refine prompt config,
   - explain tradeoffs in plain language.
5. Save the result as a project schema and run it.

---

## Critical product rules

1. **Library templates are read-only canonical assets.**
2. **Apply always creates a project-owned copy** (no in-place mutation of the library template).
3. **Version identity is explicit** for templates and project copies.
4. **Assistant suggestions are never auto-final**; user confirms changes before save.
5. **Schema contract remains compatible** with current `schema_ref` + schema artifact model.

---

## Template contract (minimum)

Each library template should include:

- `template_id` (stable ID)
- `template_version`
- human-readable `name`
- `description`
- `use_case_tags` (for discovery/filtering)
- schema payload (fields + optional prompt config)
- explanation metadata (field rationale, expected output examples)

Library templates should be indexable by tags such as legal, compliance, research, writing, contracts, and QA.

---

## AI assistant responsibilities

Assistant should support:

1. **Intent-to-schema adaptation**
   - "Adjust this template for X domain and Y output requirements."
2. **Field-level coaching**
   - explain each field and suggested type choices.
3. **Prompt config support**
   - draft system/per-block prompts aligned to selected fields.
4. **Validation support**
   - flag unclear fields, overlaps, or overly broad definitions.

Assistant should not silently alter canonical library assets.

---

## Suggested rollout (when scheduled)

### Phase 1: Library foundation (no assistant required)
- Template registry + browse/filter UI
- Template detail page with explanation and examples
- Apply-to-project / apply-to-new-project copy flow

### Phase 2: Assistant-assisted adaptation
- In-schema assistant panel for edits and guidance
- Prompt config drafting and refinement assistance
- Change preview + user approval before save

### Phase 3: Advanced intelligence
- Recommendation ranking by project/document profile
- "Closest template" auto-suggestions
- Template performance feedback loop

---

## Acceptance criteria

This future task is complete when:

1. Users can discover and apply templates without authoring raw JSON.
2. Applied templates become editable project-owned schemas.
3. Assistant materially reduces time to first usable schema.
4. Template lineage/version is auditable from applied schema back to source template.
5. Existing schema execution pipeline works unchanged with applied/adapted schemas.

---

## Dependencies and timing note

This should be scheduled after core workflow gates that stabilize:
- schema creation and save flow,
- worker/run reliability,
- review/export baseline.

It is intentionally defined now so the decision is persistent and implementation-ready when prioritization opens.
