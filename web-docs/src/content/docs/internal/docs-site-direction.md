---
title: Docs Site Direction
description: Working direction for using the BlockData docs site as a shared human and machine knowledge layer.
---

## Purpose

The BlockData docs site is not only a human-readable documentation site. It is the shared knowledge layer for:

- humans browsing docs
- AI systems in the main BlockData product
- search, retrieval, and knowledge graph workflows

The docs corpus should remain the single source of truth. Human pages, machine-readable outputs, contextual help, and future retrieval pipelines should all derive from the same content base.

## Direction To Preserve

The main ideas from the root [DIRECTION.md](../../../../DIRECTION.md) document should remain part of the working plan for this docs site:

- the docs site should serve both people and machines
- the content should support AI use cases, not just browser reading
- machine-readable outputs should be generated from the docs corpus
- the system should support vector search and knowledge graph use cases
- ArangoDB should remain part of the working keyword set for knowledge graph and retrieval architecture

Keywords to preserve in this direction:

- ArangoDB
- AI
- vector search
- knowledge graph
- KG

## Contextual Help Requirement

A major use case for this docs site is page-specific product help.

Many platforms use a collapsible help section that opens from the right side of the product UI and shows contextual guidance for the current page. BlockData should support the same pattern.

That help content should live in the docs site content system and connect directly with the docs corpus. The default assumption is:

- help content is authored in this docs site
- help content is fetched per product page or feature context
- the same source content can power both full docs pages and compact right-side help panels

Unless a simpler standard pattern proves better, the preferred direction is to keep contextual help in the same content system rather than splitting it into a separate help CMS.

## Working Implementation Direction

The simplest durable model is:

1. Author canonical docs in `src/content/docs/`
2. Add structured metadata so pages or sections can be targeted by product route, feature, or surface
3. Expose machine-readable endpoints from the docs site for application fetches
4. Let the main product request page-specific help content from the docs corpus

This keeps the docs site connected to:

- the public docs experience
- AI and RAG workflows
- contextual in-product help
- future graph and retrieval systems

## Live Shared Content Model

For the current phase of docs-site development, it is acceptable to optimize for speed and shared visibility over strict isolation.

The working assumption is:

- the docs site can be launched once and stay live
- branch teams can add content directly to a shared docs content system
- this is acceptable risk for the docs site because the content base is still early and can be reworked or torn down if needed

This should not be treated as the same risk profile as platform or application development. For the docs site, the cost of iteration is lower and the value of shared visibility is higher.

The preferred shape for this model is:

- canonical docs remain a distinct area
- live branch or workstream content is published under controlled namespaces
- examples:
  - `workstreams/<branch-or-initiative>/...`
  - `drafts/<branch-or-initiative>/...`
  - `help/<product-route-or-feature>/...`
- approved content can later be promoted into canonical docs

This allows:

- one live docs site
- shared awareness of what each branch is working on
- branch-specific updates without needing a full site redeploy workflow for every content change
- a later cleanup path once the information architecture stabilizes

## Governance Note

This model is acceptable specifically because the docs site currently has little canonical content and is still being shaped. It should be treated as an intentional early-phase operating mode, not an assumption that all product systems should behave this way.

## Design Principle

Do not treat the docs site as a separate static website with disconnected content. Treat it as a maintained content platform owned for BlockData's purposes.
