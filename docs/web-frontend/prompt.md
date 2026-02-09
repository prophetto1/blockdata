E:\writing-system\docs\product-defining-v2.0\0207-assessment+feedback+response.md
E:\writing-system\docs\product-defining-v2.0\0207-blocks.md
E:\writing-system\docs\product-defining-v2.0\0207-db-status-check.md
E:\writing-system\docs\product-defining-v2.0\0207-defining-user-defined-schemas.md
E:\writing-system\docs\product-defining-v2.0\0207-immutable-fields.md
E:\writing-system\docs\product-defining-v2.0\0207-prd-doc1.md
E:\writing-system\docs\product-defining-v2.0\0207-prd-tech-spec-doc2.md
E:\writing-system\docs\product-defining-v2.0\0207-v2-database-migration-checklist.md
E:\writing-system\docs\product-defining-v2.0\0208-docling-track-state-log.md
E:\writing-system\docs\product-defining-v2.0\0208-non-md-docling-track-implementation-plan.md


i am also seeing great reference here
https://www.eleken.co/blog-posts/wizard-ui-pattern-explained


this is different but some commonalities
https://www.eleken.co/cases/bering-lab

From the spec documents, the key additions to the storyboard I gave earlier:

"Project" is the missing container entity. The spec has documents_v2 → blocks_v2 → runs_v2 → block_overlays_v2, but no concept of grouping multiple documents under a shared schema. The blocks.md doc explicitly says: "User creates new project → uploads documents and documents are analyzed/processed within the project list page." The assessment doc echoes: "add project" as a key auth-gated page. The project entity is spec-defined but not yet built.

The wizard must lead to schema attachment, not just upload. The PRD's Design Directive is clear: "Schema creation happens in the browser. The template library, AI-assisted wizard, and visual builder are not future extensions — they are the primary schema creation paths." The wizard shouldn't end at "documents processed" — it should include schema selection/creation as the climactic step.

Three schema creation paths (all in-browser): template library, AI-assisted wizard, direct JSON authoring. The assessment doc adds: "provide a set of frequently used template user schemas — which can be loaded and modified with assistance from AI" and "the ai can examine the user data and be helpful in a way that recommends how to set it up."

Block grouping is a display concern, not structural. Groups are "a future, separate derived entity" — the project view shows documents, the document view shows the block grid. No intermediate "block group" entity needed for the wizard.

Docling track is live. The wizard must handle non-MD formats (docx, pdf) natively — they go through the Docling pipeline and produce docling_json_pointer locators. The wizard should show which track each document used.


conceptually different - but layout has commonoalities and a look and feel that is somewhat applicable to our nneeds - 

this shows the layout that has some similarities

https://www.eleken.co/cases/casescribe

https://www.eleken.co/blog-posts/wizard-ui-pattern-explained

