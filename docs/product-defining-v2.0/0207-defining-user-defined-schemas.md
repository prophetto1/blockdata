# Defining User-Defined Schemas

This document illustrates how user-defined schemas work in practice. Each section is a self-contained use case that walks through the full lifecycle: the problem, the schema, the binding, and the exported result.

Companion spec: `docs/product-defining-v2.0/2. prd-technical-spec-v3.0-draft.md` (Sections 4, 5, and 10).

---

## Use Case 1: Close Reading of 28,000 Supreme Court Opinions

### The problem

A legal researcher has a corpus of 28,000 US Supreme Court majority opinions. Each opinion is a multi-paragraph prose document. The researcher needs five metadata categories extracted from each opinion, but these categories require close reading of the text — they cannot be derived from existing structured metadata (case ID, citation, date, vote count, etc.) because they describe *what the text says*, not *what the case is about* administratively.

The five categories:

1. **Rhetorical function** — what role does this paragraph play in the opinion's structure? (issue framing, fact narrative, rule statement, rule application, holding, dicta, procedural disposition)
2. **Precedents cited** — which prior cases are cited in this paragraph?
3. **Legal principle** — if the paragraph articulates a legal rule or test, what is it?
4. **Key entities** — people, organizations, places, or objects mentioned.
5. **Reasoning type** — if the court is reasoning, what kind? (textual, analogical, policy, historical)

Reading 28,000 opinions closely enough to fill these five fields for every paragraph is thousands of hours of work. The researcher cannot do it manually.

### The source text (illustration)

The researcher has already pre-processed the corpus so that each opinion's text is a standalone `.md` file (one opinion per file, paragraphs separated by blank lines). Here are the first few paragraphs of one opinion (*Columbian Insurance Co. v. Ashby*, 29 U.S. 139, 1830):

> This is an action upon a policy of insurance bearing date 28 May, 1825, on the brig Hope on a voyage from Alexandria to Barbadoes and back to a port in the United States. The vessel is valued at $3,000, and the sum insured is $1,000.
>
> The loss as alleged in the declaration is that the vessel, whilst proceeding on her voyage and before her arrival at Barbadoes, was by storm and peril of the seas sunk and wholly lost to the plaintiffs. The whole evidence is spread out upon the record, and upon which the defendants' counsel prayed the court to instruct the jury that it was competent for it to infer and that it ought to infer from the evidence that the plaintiffs had revoked the abandonment which they had made to the defendants, which instruction the court refused to give, and a bill of exceptions was duly taken to such refusal. And whether the court erred in refusing to give the instruction prayed is the only question is the case.
>
> From the evidence, it appears that captain Brown, the master of the vessel, put into Hampton Roads for the purpose of making a harbor and securing his vessel from an approaching storm, which, from the appearance of the weather, threatened to be very severe. And on 5 June, by the violence of the storm, the brig was driven on shore above high water mark near Crany Island. On the next day, a survey was held upon her and the surveyors, after examining her situation and the injury she had received, recommended her to be sold for the benefit of all concerned. And on 14 June, Stribling, one of the owners, being at Norfolk, sent a letter of abandonment to the defendants, which was received by them on 17 June.
>
> In the case of Chesapeake Insurance Company v. Stark, 6 Cranch 272, this Court lays down the general rule that if an abandonment be legally made, it puts the underwriter completely in the place of the assured, and the agent of the latter becomes the agent of the former, and that the acts of the agent interfering with the subject insured will not affect the abandonment. But the Court takes a distinction between the acts of an agent and the acts of the assured; that in the latter case, any acts of ownership by the owner himself might be construed into a relinquishment of an abandonment which had not been accepted.

This opinion has roughly 15 paragraphs. Across 28,000 opinions, that is approximately 420,000 paragraphs — each one needing five fields filled.

### Step 1: Upload and ingest (platform creates immutable blocks)

The researcher uploads `1830-051.md`. The platform ingests it via the mdast track and produces an immutable block inventory. Every paragraph becomes one block. The immutable envelope for the entire document (shared across all blocks) looks like this:

```json
{
  "immutable": {
    "source_upload": {
      "source_uid": "a3f29b...64-char-hex",
      "source_type": "md",
      "source_filesize": 6102,
      "source_total_characters": 5843,
      "source_upload_timestamp": "2026-02-07T14:00:00Z"
    },
    "conversion": {
      "conv_status": "success",
      "conv_uid": "d7c41e...64-char-hex",
      "conv_parsing_tool": "mdast",
      "conv_representation_type": "markdown_bytes",
      "conv_total_blocks": 15,
      "conv_block_type_freq": { "paragraph": 15 },
      "conv_total_characters": 5843
    }
  }
}
```

And one representative block (block 3, the factual narrative paragraph):

```json
{
  "immutable": {
    "source_upload": { "...same as above..." },
    "conversion": { "...same as above..." },
    "block": {
      "block_uid": "d7c41e...:3",
      "block_index": 3,
      "block_type": "paragraph",
      "block_locator": { "type": "text_offset_range", "start_offset": 892, "end_offset": 1847 },
      "block_content": "From the evidence, it appears that captain Brown, the master of the vessel, put into Hampton Roads for the purpose of making a harbor and securing his vessel from an approaching storm..."
    }
  },
  "user_defined": {
    "schema_ref": null,
    "schema_uid": null,
    "data": {}
  }
}
```

At this point `user_defined` is inert. The immutable substrate exists, but no schema has been applied.

### Step 2: Create a user-defined schema

The researcher writes a JSON schema artifact that defines the five metadata categories. The platform stores this artifact as opaque JSON — it does not interpret or enforce the internal structure beyond validating: (1) the artifact is a JSON object and (2) it has `schema_ref` (string). How the schema is structured (what keys it uses, whether it includes instructions, examples, or just field names) is entirely up to the user.

The researcher uploads:

```json
{
  "schema_ref": "scotus_close_reading_v1",
  "description": "Per-block close reading extraction for Supreme Court opinions",
  "instructions": "You are analyzing one paragraph of a US Supreme Court majority opinion. Read the paragraph text provided and fill in each field below according to its instructions. If a field does not apply to this paragraph, use null.",
  "fields": {
    "rhetorical_function": {
      "type": "string",
      "enum": [
        "issue_framing",
        "fact_narrative",
        "rule_statement",
        "rule_application",
        "holding",
        "dicta",
        "procedural_disposition"
      ],
      "description": "Primary structural role of this paragraph in the opinion.",
      "instructions": "Classify the PRIMARY function. If multiple functions are present, choose the dominant one. Definitions: issue_framing = states what question the court is deciding; fact_narrative = recounts events or procedural history without applying law; rule_statement = articulates a legal rule, standard, or test in general terms; rule_application = applies a stated rule to the specific facts; holding = states the court's actual decision on the legal question presented; dicta = discusses legal points not necessary to the decision; procedural_disposition = contains the formal order (affirmed/reversed/remanded)."
    },
    "precedents_cited": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Case citations mentioned in this paragraph.",
      "instructions": "List every case citation that appears in this paragraph. Use the citation form as written in the text (e.g., '6 Cranch 272'). If no cases are cited, return an empty array."
    },
    "legal_principle": {
      "type": "string|null",
      "description": "The legal rule or test articulated, if any.",
      "instructions": "If the paragraph articulates a legal rule, standard, or test, state it in one concise sentence. If no rule is articulated, return null."
    },
    "key_entities": {
      "type": "array",
      "items": { "type": "string" },
      "description": "People, organizations, vessels, places mentioned.",
      "instructions": "List proper nouns: people, organizations, ships, geographic locations. Exclude generic terms like 'the court' or 'the jury' unless a specific court is named."
    },
    "reasoning_type": {
      "type": "string|null",
      "enum": ["textual", "analogical", "policy", "historical", null],
      "description": "The kind of legal reasoning used, if any.",
      "instructions": "If the court is actively reasoning (not just recounting facts), classify the reasoning. textual = interpreting language of a statute or contract; analogical = comparing to or distinguishing from prior cases; policy = appealing to practical consequences or fairness; historical = relying on historical practice or intent. If no reasoning is present, return null."
    }
  }
}
```

The platform stores this and computes:
- `schema_ref`: `scotus_close_reading_v1`
- `schema_uid`: `sha256(canonical JSON bytes of the schema artifact)`

### Step 3: Create a run (bind schema to document)

The researcher creates a **run** — a binding of one schema to one document for one execution instance.

- Run binds: `conv_uid` (the document's block inventory) + `schema_id` (the schema)
- The platform creates one pending overlay row per block in the document
- Result: 15 rows, one per paragraph, each waiting for a worker to fill in `user_defined.data`

This step can be repeated for every document in the corpus. 28,000 documents x 1 schema = 28,000 runs = ~420,000 pending overlay rows.

### Step 4: AI workers process blocks

Workers claim blocks atomically (`UPDATE ... WHERE status = 'pending' RETURNING *`). Each worker receives:

1. The block's `block_content` (the paragraph text)
2. The schema artifact (the full JSON the researcher uploaded)

The worker reads the paragraph, follows the schema's instructions, and writes back the filled `user_defined.data` for that block.

Multiple workers operate concurrently across the 420,000 blocks. No collisions — each block is an independent unit of work.

### Step 5: Exported result (immutable + user-defined overlay)

After all blocks are processed, the researcher exports each run as JSONL. Each line is one block with the immutable substrate and the filled user-defined overlay side by side.

**Block 0** (issue framing paragraph):

```json
{
  "immutable": {
    "source_upload": {
      "source_uid": "a3f29b...",
      "source_type": "md",
      "source_filesize": 6102,
      "source_total_characters": 5843,
      "source_upload_timestamp": "2026-02-07T14:00:00Z"
    },
    "conversion": {
      "conv_status": "success",
      "conv_uid": "d7c41e...",
      "conv_parsing_tool": "mdast",
      "conv_representation_type": "markdown_bytes",
      "conv_total_blocks": 15,
      "conv_block_type_freq": { "paragraph": 15 },
      "conv_total_characters": 5843
    },
    "block": {
      "block_uid": "d7c41e...:0",
      "block_index": 0,
      "block_type": "paragraph",
      "block_locator": { "type": "text_offset_range", "start_offset": 0, "end_offset": 287 },
      "block_content": "This is an action upon a policy of insurance bearing date 28 May, 1825, on the brig Hope on a voyage from Alexandria to Barbadoes and back to a port in the United States. The vessel is valued at $3,000, and the sum insured is $1,000."
    }
  },
  "user_defined": {
    "schema_ref": "scotus_close_reading_v1",
    "schema_uid": "e9f012...",
    "data": {
      "rhetorical_function": "issue_framing",
      "precedents_cited": [],
      "legal_principle": null,
      "key_entities": ["Columbian Insurance Company", "Ashby", "Stribling", "brig Hope", "Alexandria", "Barbadoes"],
      "reasoning_type": null
    }
  }
}
```

**Block 3** (factual narrative):

```json
{
  "immutable": {
    "block": {
      "block_uid": "d7c41e...:3",
      "block_index": 3,
      "block_type": "paragraph",
      "block_locator": { "type": "text_offset_range", "start_offset": 892, "end_offset": 1847 },
      "block_content": "From the evidence, it appears that captain Brown, the master of the vessel, put into Hampton Roads for the purpose of making a harbor and securing his vessel from an approaching storm..."
    }
  },
  "user_defined": {
    "schema_ref": "scotus_close_reading_v1",
    "schema_uid": "e9f012...",
    "data": {
      "rhetorical_function": "fact_narrative",
      "precedents_cited": [],
      "legal_principle": null,
      "key_entities": ["Captain Brown", "Hampton Roads", "Crany Island", "Stribling", "Norfolk"],
      "reasoning_type": null
    }
  }
}
```

**Block 8** (rule statement with analogical reasoning):

```json
{
  "immutable": {
    "block": {
      "block_uid": "d7c41e...:8",
      "block_index": 8,
      "block_type": "paragraph",
      "block_locator": { "type": "text_offset_range", "start_offset": 3200, "end_offset": 3890 },
      "block_content": "In the case of Chesapeake Insurance Company v. Stark, 6 Cranch 272, this Court lays down the general rule that if an abandonment be legally made, it puts the underwriter completely in the place of the assured..."
    }
  },
  "user_defined": {
    "schema_ref": "scotus_close_reading_v1",
    "schema_uid": "e9f012...",
    "data": {
      "rhetorical_function": "rule_statement",
      "precedents_cited": ["Chesapeake Insurance Company v. Stark, 6 Cranch 272"],
      "legal_principle": "A legal abandonment puts the underwriter in the place of the assured; acts of ownership by the assured (not merely an agent) may be construed as relinquishment of an unaccepted abandonment",
      "key_entities": ["Chesapeake Insurance Company", "Stark"],
      "reasoning_type": "analogical"
    }
  }
}
```

### What this gives the researcher

Every paragraph in every opinion now has:

- A stable, content-addressed identity (`block_uid`) that never changes
- The original text preserved verbatim (`block_content`)
- Five metadata fields filled by AI workers (`user_defined.data`)
- Full provenance: which schema was used, which document the block came from, where in the document the block sits

The researcher can query across the entire corpus:
- "Show every paragraph classified as `holding` across all 28,000 opinions"
- "Which opinions cite *Chesapeake v. Stark*? In which paragraphs?"
- "What is the distribution of `reasoning_type` across opinions written by Chief Justice Marshall?"
- "Find paragraphs where `legal_principle` is non-null and `rhetorical_function` is `dicta`"

If the researcher later creates a second schema (e.g., `scotus_sentiment_v1` with different fields), they can run it over the same immutable blocks without re-ingesting anything. The blocks are stable. Only the overlay changes.

---

## Use Case 2: Editing and Assessing a 39,000-Word Manuscript

### The problem

A writer has a legal-academic manuscript — roughly 39,000 words, structured across multiple acts and chapters, with case studies, theoretical argument, and empirical methodology. The manuscript is already in `.md` format:

`-personal-/papers/edited/a1-v5.5-39226.md`

The writer needs AI help with three tasks:

1. **Prose editing** — apply Strunk's 18 writing rules (active voice, omit needless words, positive form, etc.) to every paragraph and produce a revised version where warranted.
2. **Narrative flow assessment** — capture the main point of each paragraph in one sentence, so the writer can read the sentence chain in order and judge whether the argument's logic progresses coherently.
3. **Keyword extraction** — identify the most important terms introduced in each paragraph (proper nouns, key verbs, technical concepts), so the writer can see the idea vocabulary of each section at a glance.

The obstacle: no single AI session can hold 39,000 words in context while applying a consistent standard across every paragraph. The AI will shortcut, skip sections, or lose coherence partway through. The writer has tried and failed.

### Why this is a block-level problem

Strunk's rules are paragraph-level operations. You read one paragraph, check it against 18 rules, and revise. You don't need the whole document in context to apply Rule 13 ("omit needless words") to a single paragraph. The same is true for summarizing a paragraph's main point or extracting its keywords.

What the writer *actually* needs is a way to apply the same standard to every paragraph independently, then reassemble the results in reading order. That is exactly what blocks give you.

### The source text (illustration)

Here are three representative paragraphs from the manuscript — they come from different sections and illustrate different prose styles the schema must handle:

> **Paragraph A** (theoretical framing): "The Structural Defect Framework identifies a category of legal harm that existing doctrine does not adequately name: *unilateral architectural allocation*. This is the condition in which one party designs a system that predictably blocks verification of legally relevant information at the moment of reliance, then benefits from the resulting evidentiary gap."
>
> **Paragraph B** (argumentative): "Structure works where training fails. The precise mechanisms underlying discriminatory outcomes remain contested—implicit bias, in-group favoritism, statistical discrimination—but they share a common channel: unstructured discretion. Training targets the mechanism. Structure targets the channel. Structure works because it does not require knowing which mechanism is operative; it narrows the space through which any biased cognition can reach outcomes."
>
> **Paragraph C** (rhetorical): "Consider what you don't know about the AI that answered your question this week. Which model was it—the one on the label, or a cheaper derivative? Whose weights, trained on what, fine-tuned by whom, served through whose infrastructure, optimized for whose costs? You don't know. You can't know. The session ended. Whatever happened inside is already gone."

The full document has roughly 500+ paragraphs across its acts and chapters. Each one needs the same three tasks applied.

### Step 1: Upload and ingest

The writer uploads `a1-v5.5-39226.md`. The platform ingests it via the mdast track and produces an immutable block inventory. Paragraphs become `paragraph` blocks; section headings become `heading` blocks.

```json
{
  "immutable": {
    "source_upload": {
      "source_uid": "b8e4a1...64-char-hex",
      "source_type": "md",
      "source_filesize": 210450,
      "source_total_characters": 198000,
      "source_upload_timestamp": "2026-02-07T16:00:00Z"
    },
    "conversion": {
      "conv_status": "success",
      "conv_uid": "c2f73d...64-char-hex",
      "conv_parsing_tool": "mdast",
      "conv_representation_type": "markdown_bytes",
      "conv_total_blocks": 540,
      "conv_block_type_freq": { "paragraph": 490, "heading": 45, "code_block": 3, "list_item": 2 },
      "conv_total_characters": 198000
    }
  }
}
```

540 blocks. Each one is an independent unit of work.

### Step 2: Create a user-defined schema

The writer creates a single schema artifact that combines all three tasks. The schema includes the full Strunk reference text in its `reference_material` key so that every AI worker has the rules available without needing separate context. The platform stores the entire artifact as opaque JSON — it does not parse `reference_material`, `instructions`, or `fields`.

```json
{
  "schema_ref": "prose_edit_and_assess_v1",
  "description": "Per-block prose editing (Strunk's 18 rules), narrative summary, and keyword extraction for a long-form manuscript.",
  "reference_material": {
    "source": "The Elements of Style (1918), William Strunk Jr.",
    "note": "The full text of the 18 rules is included below so the worker has access to the complete reference. The worker must read and internalize these rules before processing any block.",
    "rules": [
      {
        "rule_number": 1,
        "title": "Form the possessive singular of nouns by adding 's",
        "summary": "Follow this rule whatever the final consonant: Charles's friend, Burns's poems. Exceptions: ancient proper names in -es and -is, Jesus', and conscience' sake forms."
      },
      {
        "rule_number": 2,
        "title": "In a series of three or more terms with a single conjunction, use a comma after each term except the last",
        "summary": "Red, white, and blue. He opened the letter, read it, and made a note of its contents."
      },
      {
        "rule_number": 3,
        "title": "Enclose parenthetic expressions between commas",
        "summary": "Never insert one comma and omit the other. Non-restrictive relative clauses are always parenthetic."
      },
      {
        "rule_number": 4,
        "title": "Place a comma before a conjunction introducing a co-ordinate clause",
        "summary": "The situation is perilous, but there is still one chance of escape."
      },
      {
        "rule_number": 5,
        "title": "Do not join independent clauses by a comma",
        "summary": "Use a semicolon if no conjunction is present. Stevenson's romances are entertaining; they are full of exciting adventures."
      },
      {
        "rule_number": 6,
        "title": "Do not break sentences in two",
        "summary": "Do not use periods for commas. Sentence fragments should serve deliberate emphasis, not accidental grammar."
      },
      {
        "rule_number": 7,
        "title": "A participial phrase at the beginning of a sentence must refer to the grammatical subject",
        "summary": "Walking slowly down the road, he saw a woman — 'walking' must refer to 'he', not to 'woman'."
      },
      {
        "rule_number": 8,
        "title": "Make the paragraph the unit of composition: one paragraph to each topic",
        "summary": "Each paragraph should treat one topic. The beginning of each paragraph signals to the reader that a new step has been reached."
      },
      {
        "rule_number": 9,
        "title": "Begin each paragraph with a topic sentence; end it in conformity with the beginning",
        "summary": "The topic sentence comes at or near the beginning; succeeding sentences develop it; the final sentence emphasizes or concludes."
      },
      {
        "rule_number": 10,
        "title": "Use the active voice",
        "summary": "The active voice is more direct and vigorous. 'I shall always remember my first visit to Boston' is better than 'My first visit to Boston will always be remembered by me.'"
      },
      {
        "rule_number": 11,
        "title": "Put statements in positive form",
        "summary": "Make definite assertions. 'He usually came late' is better than 'He was not very often on time.'"
      },
      {
        "rule_number": 12,
        "title": "Use definite, specific, concrete language",
        "summary": "Prefer the specific to the general. 'It rained every day for a week' is better than 'A period of unfavorable weather set in.'"
      },
      {
        "rule_number": 13,
        "title": "Omit needless words",
        "summary": "A sentence should contain no unnecessary words. 'Whether' is better than 'the question as to whether'. Make every word tell."
      },
      {
        "rule_number": 14,
        "title": "Avoid a succession of loose sentences",
        "summary": "Do not construct a series of sentences with two co-ordinate clauses joined by and, but, so, who, which. Vary sentence structure."
      },
      {
        "rule_number": 15,
        "title": "Express co-ordinate ideas in similar form",
        "summary": "Parallel construction: expressions of similar content and function should be outwardly similar."
      },
      {
        "rule_number": 16,
        "title": "Keep related words together",
        "summary": "Bring together words that are related in thought. The subject and principal verb should not be needlessly separated."
      },
      {
        "rule_number": 17,
        "title": "In summaries, keep to one tense",
        "summary": "Use the present tense throughout a summary. Do not shift between tenses."
      },
      {
        "rule_number": 18,
        "title": "Place the emphatic words of a sentence at the end",
        "summary": "The proper place for the most prominent word or group is usually the end of the sentence."
      }
    ]
  },
  "instructions": "You are editing one paragraph of a 39,000-word legal-academic manuscript. First, read the 18 Strunk rules in reference_material. Then read the block content provided. Complete all three fields below for this block.",
  "fields": {
    "revised_block": {
      "type": "string",
      "description": "The full paragraph text after applying Strunk's rules.",
      "instructions": "Rewrite the entire block content, applying any of the 18 Strunk rules that improve clarity, conciseness, or force. If the original paragraph already conforms to all rules, return it unchanged. Preserve the author's technical vocabulary and argument — do not simplify domain-specific terms or alter meaning. The revision must be a complete replacement: if you take all revised_block values in block_index order, the result should be a coherent, fully revised document."
    },
    "revision_notes": {
      "type": "string|null",
      "description": "Which rules were applied and why.",
      "instructions": "If any changes were made, list each rule applied by number and title, followed by a brief example from this paragraph showing the before and after. Format: 'Rule 13 (Omit needless words): \"the question as to whether\" → \"whether\". Rule 10 (Active voice): \"was identified by the court\" → \"the court identified\".' If no changes were needed, return null."
    },
    "narrative_summary": {
      "type": "string",
      "description": "The main point of this paragraph in one sentence.",
      "instructions": "Capture the single most important claim, argument step, or information contribution of this paragraph in one sentence. This sentence will be read in sequence with summaries from adjacent blocks to assess whether the document's logic progresses coherently. Write it as a declarative statement, not a meta-description (write 'SDF shifts liability from operators to architects' not 'This paragraph discusses the shift in liability')."
    },
    "key_terms": {
      "type": "array",
      "items": { "type": "string" },
      "max_items": 5,
      "description": "The most important keywords or phrases introduced in this paragraph.",
      "instructions": "Identify up to 5 terms that carry the paragraph's conceptual weight. Include: (1) proper nouns if present (case names, people, frameworks), (2) technical terms being defined or used, (3) key verbs that drive the argument. Prefer terms being introduced or defined here over terms merely referenced in passing."
    }
  }
}
```

The platform stores this artifact. The `reference_material` key — containing the full 18-rule Strunk reference — is part of the schema JSON. The platform does not interpret it; it stores it and serves it to workers alongside each block.

### Step 3: Create a run and process

The writer creates a run binding `prose_edit_and_assess_v1` to the manuscript's `conv_uid`. The platform creates 540 pending overlay rows (one per block).

AI workers claim blocks. Each worker receives:
1. The block's `block_content` (one paragraph of the manuscript)
2. The full schema artifact (including the 18-rule Strunk reference in `reference_material`)

The worker reads the Strunk rules, reads the paragraph, and fills in all three fields. Since every block is independent, workers process them concurrently across the entire 540-block inventory.

### Step 4: Exported result

**Block 127** (Paragraph A — theoretical framing):

```json
{
  "immutable": {
    "source_upload": { "source_uid": "b8e4a1...", "source_type": "md", "...": "..." },
    "conversion": { "conv_uid": "c2f73d...", "conv_parsing_tool": "mdast", "...": "..." },
    "block": {
      "block_uid": "c2f73d...:127",
      "block_index": 127,
      "block_type": "paragraph",
      "block_locator": { "type": "text_offset_range", "start_offset": 48210, "end_offset": 48592 },
      "block_content": "The Structural Defect Framework identifies a category of legal harm that existing doctrine does not adequately name: unilateral architectural allocation. This is the condition in which one party designs a system that predictably blocks verification of legally relevant information at the moment of reliance, then benefits from the resulting evidentiary gap."
    }
  },
  "user_defined": {
    "schema_ref": "prose_edit_and_assess_v1",
    "schema_uid": "a4b5c6...",
    "data": {
      "revised_block": "The Structural Defect Framework identifies a category of legal harm that existing doctrine has not named: unilateral architectural allocation. One party designs a system that predictably blocks verification of legally relevant information at the moment of reliance, then benefits from the resulting evidentiary gap.",
      "revision_notes": "Rule 13 (Omit needless words): 'does not adequately name' → 'has not named' (adequately is implied by the naming itself). Rule 13: 'This is the condition in which' → removed; second sentence restated directly.",
      "narrative_summary": "SDF names a new legal wrong — unilateral architectural allocation — in which one party designs a system to block verification and then benefits from the gap.",
      "key_terms": ["Structural Defect Framework", "unilateral architectural allocation", "evidentiary gap", "verification", "designs"]
    }
  }
}
```

**Block 134** (Paragraph B — argumentative):

```json
{
  "immutable": {
    "block": {
      "block_uid": "c2f73d...:134",
      "block_index": 134,
      "block_type": "paragraph",
      "block_locator": { "type": "text_offset_range", "start_offset": 51400, "end_offset": 51890 },
      "block_content": "Structure works where training fails. The precise mechanisms underlying discriminatory outcomes remain contested—implicit bias, in-group favoritism, statistical discrimination—but they share a common channel: unstructured discretion. Training targets the mechanism. Structure targets the channel. Structure works because it does not require knowing which mechanism is operative; it narrows the space through which any biased cognition can reach outcomes."
    }
  },
  "user_defined": {
    "schema_ref": "prose_edit_and_assess_v1",
    "schema_uid": "a4b5c6...",
    "data": {
      "revised_block": "Structure works where training fails. The precise mechanisms underlying discriminatory outcomes remain contested—implicit bias, in-group favoritism, statistical discrimination—but they share a common channel: unstructured discretion. Training targets the mechanism. Structure targets the channel. Structure works because it need not identify which mechanism is operative; it narrows the space through which any biased cognition can reach outcomes.",
      "revision_notes": "Rule 13 (Omit needless words): 'does not require knowing' → 'need not identify' (shorter, more direct). No other rules triggered — the paragraph already uses active voice, parallel construction, positive form, and places emphatic words at sentence ends.",
      "narrative_summary": "Structural interventions succeed where bias training fails because they close the channel of unstructured discretion regardless of which bias mechanism is operative.",
      "key_terms": ["unstructured discretion", "implicit bias", "in-group favoritism", "statistical discrimination", "narrows"]
    }
  }
}
```

**Block 138** (Paragraph C — rhetorical):

```json
{
  "immutable": {
    "block": {
      "block_uid": "c2f73d...:138",
      "block_index": 138,
      "block_type": "paragraph",
      "block_locator": { "type": "text_offset_range", "start_offset": 52800, "end_offset": 53190 },
      "block_content": "Consider what you don't know about the AI that answered your question this week. Which model was it—the one on the label, or a cheaper derivative? Whose weights, trained on what, fine-tuned by whom, served through whose infrastructure, optimized for whose costs? You don't know. You can't know. The session ended. Whatever happened inside is already gone."
    }
  },
  "user_defined": {
    "schema_ref": "prose_edit_and_assess_v1",
    "schema_uid": "a4b5c6...",
    "data": {
      "revised_block": "Consider what you don't know about the AI that answered your question this week. Which model was it—the one on the label, or a cheaper derivative? Whose weights, trained on what, fine-tuned by whom, served through whose infrastructure, optimized for whose costs? You don't know. You can't know. The session ended. Whatever happened inside is already gone.",
      "revision_notes": null,
      "narrative_summary": "The user cannot know which AI model, configuration, or infrastructure actually answered their query — that information is gone the moment the session ends.",
      "key_terms": ["configuration provenance", "model identity", "session", "infrastructure", "gone"]
    }
  }
}
```

### Reassembly: three outputs from one run

Because every block has a stable `block_uid` and `block_index`, the writer can extract three distinct outputs from the same JSONL export by reading different fields in order:

**Output 1 — Revised manuscript:**
Concatenate `user_defined.data.revised_block` for all blocks in `block_index` order. The result is the full 39,000-word manuscript, revised paragraph by paragraph against Strunk's 18 rules, reassembled in reading order. Heading blocks pass through unchanged.

**Output 2 — Narrative sentence chain:**
Read `user_defined.data.narrative_summary` for all `paragraph` blocks in `block_index` order:

> 1. SDF names a new legal wrong — unilateral architectural allocation — in which one party designs a system to block verification and then benefits from the gap.
> 2. ...
> 3. Structural interventions succeed where bias training fails because they close the channel of unstructured discretion regardless of which bias mechanism is operative.
> 4. ...
> 5. The user cannot know which AI model, configuration, or infrastructure actually answered their query — that information is gone the moment the session ends.
> 6. ...

The writer reads this chain and asks: does each sentence follow logically from the previous? Are there jumps? Repetitions? Sections where the argument stalls? This is the narrative flow assessment — produced from the same run, without a separate schema.

**Output 3 — Keyword map:**
Read `user_defined.data.key_terms` per block. Group by section (using heading blocks as delimiters). This grouping is a derived view over the per-block JSONL export; it does not change `block_uid` or the canonical per-block export shape. The writer sees which concepts dominate each chapter, where new terms are introduced, and whether vocabulary is consistent across the manuscript.

### In-Platform Experience (Web-First)

> **The writer does not export JSONL to see these results.** The block viewer is the primary interface. Everything described above happens in the browser.

**What the writer actually sees:**

The writer navigates to the document detail page and sees their 540 blocks as rows in the block viewer. They select the `prose_edit_and_assess_v1` run from the run selector dropdown. Four dynamic columns appear to the right of the immutable block columns:

| # | Type | Content (preview) | Status | revised_block | revision_notes | narrative_summary | key_terms |
|:--|:--|:--|:--|:--|:--|:--|:--|
| 127 | paragraph | The Structural Defect Framework identifies... | complete | The Structural Defect Framework identifies a category... | Rule 13: 'does not adequately name' → 'has not named'... | SDF names a new legal wrong — unilateral architectural... | SDF, unilateral architectural allocation, ... |
| 128 | paragraph | ... | pending | — | — | — | — |
| 134 | paragraph | Structure works where training fails... | complete | Structure works where training fails... | Rule 13: 'does not require knowing' → 'need not identify'... | Structural interventions succeed where bias training... | unstructured discretion, implicit bias, ... |

**Real-time feedback:** As blocks complete, the Status column transitions from gray (pending) to green (complete). The writer watches their manuscript being edited paragraph by paragraph. No polling, no refresh — Supabase Realtime pushes updates to the browser.

**Interactive review:** The writer clicks a row to expand it. The expanded view shows:
- The full original text (left) alongside the full revised text (right)
- Complete revision notes explaining which Strunk rules were applied and why
- The narrative summary sentence for this block
- All key terms extracted

**Narrative flow check — in the browser:** The writer doesn't need to export JSONL and concatenate `narrative_summary` fields in a script. They filter the block viewer to show only `paragraph` blocks, then read the `narrative_summary` column top to bottom. The flow assessment is visible in one scrollable column — does each sentence follow from the previous? Are there jumps? The writer spots problems directly in the viewer and notes which blocks need manual revision.

**When JSONL export matters:** The writer exports JSONL only when they want to produce the three reassembled outputs for external use — the revised manuscript as a `.md` file, the narrative chain as a separate document, the keyword map as a spreadsheet. These are downstream artifacts. The primary working experience — reviewing edits, checking narrative flow, spotting weak paragraphs — happens entirely in the browser.

### Why blocks solve the context-window problem

Without blocks, the writer has two bad options:
- **Ask one AI to read the whole document** — it will shortcut, lose context, and apply rules inconsistently across 39,000 words.
- **Manually split the document into chunks** — the writer must do the splitting, keep track of what was processed, and reassemble by hand.

With blocks, the platform handles the splitting deterministically (mdast parsing), each paragraph gets the same schema and the same Strunk reference, workers process independently, and the writer reviews results directly in the block viewer as they complete. The 39,000-word manuscript is no harder than a 500-word essay — only the number of blocks changes. JSONL export is available for producing final deliverables, but the creative review loop lives in the browser.

---

## Use Case 3: Building a Knowledge Graph from 28,000 Supreme Court Opinions

### The problem

A legal researcher wants to build a paragraph-addressable knowledge graph from the entire US Supreme Court corpus — 28,000 majority opinions spanning 1791 to 2022. The knowledge graph needs typed nodes (cases, legal principles, entities, statutes), typed edges (cites, follows, overrules, applies), and full provenance linking every node and edge back to the specific paragraph that generated it.

The researcher already has substantial case-level infrastructure in a DuckDB database (`legal-10`):

| Existing data source | Rows | What it provides |
|:--|--:|:--|
| `scdb_cases` | 29,021 | 55 coded variables per case: issue area, decision direction, vote splits, authority basis, jurisdiction, disposition |
| `shepards_edges` | 5,711,699 | Case-to-case citation treatment graph (followed, distinguished, overruled, etc.) across all citing courts |
| `fowler_scores` | 27,846 | Case authority ranking (Fowler auth_score + pauth_score) |
| `martin_quinn_scores` | 800 | Justice ideology scores (Martin-Quinn) by term |
| `scdb_full_with_text.jsonl` | 27,733 | Full majority opinion text per case (SHA-256 hashed) |
| `citation_inventory` | 378,938 | Citation occurrences with character offset positions in opinion text |

This is rich case-level data. The SCDB tells you *Marbury v. Madison* is about judicial review (issueArea = 9), decided 6-0, with Marshall authoring. Shepard's tells you it has been cited 5,000+ times. Fowler ranks its authority.

But none of this data can answer paragraph-level questions:

- Which paragraph of *Marbury v. Madison* articulates the holding?
- When *Brown v. Board* cites *Plessy v. Ferguson*, in which paragraph and for what principle?
- What legal test does paragraph 7 of *Miranda v. Arizona* articulate, and what are its elements?
- Is the citation to *Chevron* in paragraph 12 of a 2020 opinion dicta or part of the holding?

Shepard's edges say case A cites case B, but not *where* in the opinion or *for what principle*. The SCDB issue area code says "judicial power" but doesn't locate the holding paragraph. The Fowler score ranks authority but cannot distinguish whether a case is cited as binding precedent or background context.

These are paragraph-level questions. They require paragraph-level structured extraction. That is what blocks and user-defined schemas provide.

### The architectural parallel: Learning Commons Knowledge Graph

This use case mirrors a real-world KG: the Learning Commons Knowledge Graph, which represents academic standards (Common Core + 15+ state curricula) as a graph of typed entities and relationships.

| Learning Commons | SCOTUS KG (this use case) |
|:--|:--|
| Standard (text of one academic standard) | Block (one paragraph of one opinion) |
| LearningComponent (decomposed atomic skill) | Extracted entity, rule, or citation from `user_defined.data` |
| `SUPPORTS` edge (standard → learning component) | Block → extracted entity (derived from schema) |
| `CROSSWALK` edge (standard ↔ standard, Jaccard over shared LCs) | Case ↔ case (Jaccard over shared entities/citations) |
| `PREREQUISITE` edge (expert-defined learning progression) | Citation treatment edge (followed / overruled / distinguished) |
| Expert annotators (domain-expert curation) | AI workers processing blocks with user-defined schemas |
| JSONL export (nodes.jsonl + relationships.jsonl) | JSONL export (immutable + user_defined per block, per schema) |

The key architectural insight: both systems produce structured JSON with explicit typing and provenance from source text. The Learning Commons KG uses expert curation to decompose standards into granular learning components. The SCOTUS KG replaces expert annotators with AI workers operating on immutable blocks — the same decomposition pattern, automated at corpus scale.

The Learning Commons KG is loosely coupled across two repos: a data repository (knowledge graph exports, API, MCP server) and an evaluator application (LLM chains that consume KG data as reference material). The SCOTUS KG follows the same pattern: the platform provides the data infrastructure (blocks + schema overlays + JSONL exports) and the AI workers consume that infrastructure to produce structured extractions.

### Why multiple schemas (not one)

Use Case 1 showed a single schema (`scotus_close_reading_v1`) with 5 fields applied to every paragraph. For a knowledge graph, different facets of the text require different extraction schemas. The fields, instructions, reference material, and output structure for entity extraction are fundamentally different from those for citation analysis or legal rule extraction.

The platform's multi-schema design handles this natively. The same immutable blocks support many schemas attached via separate runs. Each schema extracts one facet, and the combined JSONL exports compose into a knowledge graph.

Five schemas, layered:

| Schema | Purpose | KG output |
|:--|:--|:--|
| `scotus_structural_v1` | Paragraph classification (rhetorical function, reasoning type) | Node labels — which blocks are holdings, dicta, rule statements, etc. |
| `scotus_entities_v1` | Named entity extraction (parties, judges, courts, statutes, places) | KG nodes: Party, Judge, Court, Statute, Place |
| `scotus_citations_v1` | Citation graph extraction with treatment type | KG edges: Case → CITES → Case (with treatment, principle, paragraph locator) |
| `scotus_legal_rules_v1` | Rule, holding, and test extraction | KG nodes: LegalRule, Test, Holding |
| `scotus_topic_classification_v1` | Subject matter and doctrinal area tagging | Taxonomy edges and classification labels |

### Step 1: Upload and ingest (28,000 documents)

The researcher extracts each opinion's text from `scdb_full_with_text.jsonl` into a standalone `.md` file — one opinion per file, named by SCDB `caseId`, paragraphs separated by blank lines:

```
scotus_opinions/
  1791-001.md
  1791-002.md
  ...
  2022-042.md
```

28,000 files. The platform ingests all of them via the mdast track. Each opinion averages roughly 15 paragraphs, producing approximately 420,000 immutable blocks across the corpus. The `opinion_text_sha256` already stored in legal-10 maps directly to `source_uid` in the immutable envelope — both are SHA-256 hashes of the source bytes, providing a deterministic join key between the platform's block inventory and the existing database.

Representative corpus-level conversion statistics:

```json
{
  "corpus_summary": {
    "total_documents": 28000,
    "total_blocks": 420000,
    "avg_blocks_per_document": 15,
    "block_type_distribution": {
      "paragraph": 395000,
      "heading": 20000,
      "list_item": 3000,
      "footnote": 1500,
      "other": 500
    }
  }
}
```

Each block has a stable `block_uid` (`conv_uid + ":" + block_index`) that never changes. The 420,000-block inventory is the immutable substrate for all subsequent schema work.

### Step 2: Create five user-defined schemas

The researcher writes five schema artifacts. Each is stored by the platform as opaque JSON. The platform does not interpret the internal structure — it stores the artifact and serves it to workers alongside each block.

#### Schema 1: `scotus_structural_v1` — Paragraph classification

This schema classifies every paragraph's structural role within the opinion. It is a focused version of Use Case 1's `scotus_close_reading_v1`, narrowed to the two fields most relevant for KG node labeling.

```json
{
  "schema_ref": "scotus_structural_v1",
  "description": "Classify each paragraph's rhetorical function and reasoning type within a Supreme Court majority opinion.",
  "instructions": "Read this paragraph of a US Supreme Court majority opinion. Classify its primary rhetorical function and reasoning type. If a field does not apply, use null.",
  "fields": {
    "rhetorical_function": {
      "type": "string",
      "enum": ["issue_framing", "fact_narrative", "procedural_history", "rule_statement",
               "rule_application", "holding", "dicta", "concurrence_note", "dissent_note",
               "procedural_disposition", "syllabus_summary"],
      "description": "The primary structural role of this paragraph in the opinion.",
      "instructions": "Classify the dominant function. issue_framing = states the question presented; fact_narrative = recounts events without applying law; procedural_history = traces the case through lower courts; rule_statement = articulates a legal rule or test in general terms; rule_application = applies a stated rule to the specific facts; holding = states the court's decision on the question presented; dicta = discusses legal points not necessary to the decision; procedural_disposition = formal order (affirmed/reversed/remanded)."
    },
    "reasoning_type": {
      "type": "string|null",
      "enum": ["textual", "analogical", "policy", "historical", "structural", null],
      "description": "The kind of legal reasoning used, if the court is actively reasoning.",
      "instructions": "textual = interpreting statutory or constitutional text; analogical = comparing to or distinguishing from precedent; policy = appealing to consequences or fairness; historical = relying on historical practice or original meaning; structural = reasoning from constitutional structure. Null if paragraph is purely narrative or procedural."
    }
  }
}
```

#### Schema 2: `scotus_entities_v1` — Named entity extraction

```json
{
  "schema_ref": "scotus_entities_v1",
  "description": "Extract named entities from each paragraph of a Supreme Court majority opinion.",
  "instructions": "Read this paragraph. Identify all named entities of the types listed below. Only include entities explicitly mentioned — do not infer from context outside the block.",
  "fields": {
    "parties": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "role": { "type": "string", "enum": ["petitioner", "respondent", "appellant", "appellee", "amicus", "intervenor", "defendant", "plaintiff", "other"] }
        }
      },
      "description": "Parties to the case or related cases mentioned in this paragraph."
    },
    "judges": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "role": { "type": "string", "enum": ["author", "concurring", "dissenting", "cited_judge", "other"] }
        }
      },
      "description": "Judges or justices named in this paragraph."
    },
    "courts": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Courts mentioned (e.g., 'Fifth Circuit', 'District Court for the Southern District of New York')."
    },
    "statutes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "citation": { "type": "string" },
          "short_name": { "type": "string|null" }
        }
      },
      "description": "Statutes, regulations, or constitutional provisions cited."
    },
    "places": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Geographic locations mentioned."
    },
    "dates": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "date": { "type": "string" },
          "context": { "type": "string" }
        }
      },
      "description": "Dates mentioned with their context."
    }
  }
}
```

#### Schema 3: `scotus_citations_v1` — Citation graph extraction

```json
{
  "schema_ref": "scotus_citations_v1",
  "description": "Extract case citations with treatment classification from each paragraph of a Supreme Court majority opinion.",
  "instructions": "Read this paragraph. Identify every case citation. For each, classify how the author treats the cited case and state the principle for which it is cited. If no cases are cited, return empty arrays.",
  "fields": {
    "cases_cited": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "case_name": { "type": "string", "description": "Case name as written in text." },
          "citation": { "type": "string", "description": "Reporter citation as written." },
          "normalized_us_cite": { "type": "string|null", "description": "Normalized to U.S. Reports format if identifiable." },
          "treatment": {
            "type": "string",
            "enum": ["followed", "applied", "distinguished", "overruled", "questioned", "cited_for_principle", "discussed", "string_cited"],
            "description": "How the authoring court treats the cited case in this paragraph."
          },
          "principle_cited_for": { "type": "string|null", "description": "The proposition the cited case supports, in one sentence." }
        }
      },
      "description": "All case citations appearing in this paragraph."
    },
    "statutes_cited": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "citation": { "type": "string" },
          "interpretation": { "type": "string|null", "description": "If the court interprets this statute, what it holds the statute means." }
        }
      },
      "description": "Statutory citations with any interpretation provided."
    }
  }
}
```

#### Schema 4: `scotus_legal_rules_v1` — Rule and holding extraction

```json
{
  "schema_ref": "scotus_legal_rules_v1",
  "description": "Extract legal rules, tests, holdings, and standards of review from each paragraph of a Supreme Court majority opinion.",
  "instructions": "Read this paragraph. If it articulates a legal rule, test, holding, or standard of review, extract it. Many paragraphs will have null for all fields — only populate when the paragraph actually states doctrine.",
  "fields": {
    "legal_principle": {
      "type": "string|null",
      "description": "The legal rule or principle articulated, stated in one sentence."
    },
    "test_articulated": {
      "type": "object|null",
      "properties": {
        "name": { "type": "string", "description": "The test name (e.g., 'strict scrutiny', 'Lemon test')." },
        "elements": { "type": "array", "items": { "type": "string" }, "description": "The prongs or elements of the test." }
      },
      "description": "If the paragraph defines a multi-element legal test, its name and elements."
    },
    "holding": {
      "type": "string|null",
      "description": "If this paragraph contains the court's holding on the question presented, state it."
    },
    "standard_of_review": {
      "type": "string|null",
      "description": "If a standard of review is stated or applied (e.g., 'de novo', 'abuse of discretion', 'strict scrutiny')."
    }
  }
}
```

#### Schema 5: `scotus_topic_classification_v1` — Subject matter tagging

```json
{
  "schema_ref": "scotus_topic_classification_v1",
  "description": "Classify the subject matter and doctrinal area of each paragraph in a Supreme Court majority opinion.",
  "instructions": "Read this paragraph. Classify its primary topic, identify any constitutional provisions at issue, and extract the key concepts.",
  "fields": {
    "primary_topic": {
      "type": "string",
      "enum": ["constitutional", "criminal_procedure", "civil_rights", "first_amendment",
               "due_process", "administrative", "commercial", "property", "labor",
               "tax", "environmental", "immigration", "tribal", "military", "other"],
      "description": "The primary doctrinal area of this paragraph."
    },
    "constitutional_provisions": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Constitutional provisions discussed (e.g., 'Fourth Amendment', 'Equal Protection Clause')."
    },
    "legal_domain": {
      "type": "string",
      "description": "Specific legal sub-area (more granular than primary_topic, e.g., 'qualified immunity', 'habeas corpus')."
    },
    "keyword_concepts": {
      "type": "array",
      "items": { "type": "string" },
      "max_items": 5,
      "description": "Key legal concepts or terms in this paragraph."
    }
  }
}
```

### Step 3: Create runs and process (scale)

The researcher creates runs binding each schema to each document:

- 5 schemas × 28,000 documents = **140,000 runs**
- 140,000 runs × ~15 blocks per document = **~2.1 million pending overlay rows**

AI workers claim blocks atomically. Each worker receives one block's `block_content` and one schema artifact. Because every block is an independent unit of work, workers process concurrently across all 2.1 million evaluations. Throughput scales linearly with worker count.

The 5 schemas can be run in any order — or simultaneously. The immutable blocks do not change between runs.

### Step 4: Exported results (multi-schema overlay)

After processing, the researcher exports JSONL per run. Each schema produces its own export file. For the *Chesapeake v. Stark* paragraph from *Columbian Insurance v. Ashby* (block 8, introduced in Use Case 1), the five exports each contain the same immutable envelope with different `user_defined.data`.

**Schema 1 export** (`scotus_structural_v1`):

```json
{
  "immutable": {
    "source_upload": { "source_uid": "a3f29b...", "source_type": "md" },
    "conversion": { "conv_uid": "d7c41e...", "conv_parsing_tool": "mdast" },
    "block": {
      "block_uid": "d7c41e...:8",
      "block_index": 8,
      "block_type": "paragraph",
      "block_locator": { "type": "text_offset_range", "start_offset": 3200, "end_offset": 3890 },
      "block_content": "In the case of Chesapeake Insurance Company v. Stark, 6 Cranch 272, this Court lays down the general rule that if an abandonment be legally made, it puts the underwriter completely in the place of the assured, and the agent of the latter becomes the agent of the former, and that the acts of the agent interfering with the subject insured will not affect the abandonment. But the Court takes a distinction between the acts of an agent and the acts of the assured; that in the latter case, any acts of ownership by the owner himself might be construed into a relinquishment of an abandonment which had not been accepted."
    }
  },
  "user_defined": {
    "schema_ref": "scotus_structural_v1",
    "schema_uid": "s1a2b3...",
    "data": {
      "rhetorical_function": "rule_statement",
      "reasoning_type": "analogical"
    }
  }
}
```

**Schema 2 export** (`scotus_entities_v1`):

```json
{
  "immutable": { "...same immutable envelope as above..." },
  "user_defined": {
    "schema_ref": "scotus_entities_v1",
    "schema_uid": "s2d4e5...",
    "data": {
      "parties": [
        { "name": "Chesapeake Insurance Company", "role": "other" },
        { "name": "Stark", "role": "other" }
      ],
      "judges": [],
      "courts": ["this Court"],
      "statutes": [],
      "places": [],
      "dates": []
    }
  }
}
```

**Schema 3 export** (`scotus_citations_v1`):

```json
{
  "immutable": { "...same immutable envelope..." },
  "user_defined": {
    "schema_ref": "scotus_citations_v1",
    "schema_uid": "s3f6g7...",
    "data": {
      "cases_cited": [
        {
          "case_name": "Chesapeake Insurance Company v. Stark",
          "citation": "6 Cranch 272",
          "normalized_us_cite": "10 U.S. 272",
          "treatment": "followed",
          "principle_cited_for": "A legal abandonment puts the underwriter in the place of the assured; the agent's acts do not affect the abandonment, but acts of ownership by the assured himself may constitute relinquishment."
        }
      ],
      "statutes_cited": []
    }
  }
}
```

**Schema 4 export** (`scotus_legal_rules_v1`):

```json
{
  "immutable": { "...same immutable envelope..." },
  "user_defined": {
    "schema_ref": "scotus_legal_rules_v1",
    "schema_uid": "s4h8i9...",
    "data": {
      "legal_principle": "A legal abandonment puts the underwriter in the place of the assured and makes the agent of the assured the agent of the underwriter; however, acts of ownership by the assured himself (as distinct from an agent) may be construed as relinquishment of an unaccepted abandonment.",
      "test_articulated": null,
      "holding": null,
      "standard_of_review": null
    }
  }
}
```

**Schema 5 export** (`scotus_topic_classification_v1`):

```json
{
  "immutable": { "...same immutable envelope..." },
  "user_defined": {
    "schema_ref": "scotus_topic_classification_v1",
    "schema_uid": "s5j0k1...",
    "data": {
      "primary_topic": "commercial",
      "constitutional_provisions": [],
      "legal_domain": "marine insurance",
      "keyword_concepts": ["abandonment", "underwriter", "assured", "agent", "acts of ownership"]
    }
  }
}
```

Five schema exports, one paragraph. Each extracts a different facet. The immutable block (`d7c41e...:8`) is the stable join key across all five.

### KG assembly: from JSONL exports to knowledge graph

After exporting all 5 schemas across all 28,000 cases, the researcher assembles the knowledge graph in a post-export pipeline. The platform's job ends at JSONL export — KG assembly is a downstream consumer of the platform's structured output.

```
Phase 1: Ingest
  28,000 .md files → platform → ~420,000 immutable blocks
  (stable block_uids, deterministic source_uids)

Phase 2: Schema runs
  5 schemas × 28,000 cases = 140,000 runs → ~2.1M overlay evaluations
  Schema 1: structural classification → paragraph labels
  Schema 2: entity extraction → named entities per paragraph
  Schema 3: citation extraction → citation edges per paragraph
  Schema 4: rule/holding extraction → doctrinal content
  Schema 5: topic classification → taxonomy labels

Phase 3: KG assembly (post-export pipeline)
  ├─ Nodes from Schema 2: deduplicate parties, judges, courts, statutes
  │   → create typed nodes with provenance (block_uid of first mention)
  ├─ Edges from Schema 3: resolve normalized_us_cite → link to case nodes
  │   → create CITES edges with treatment + principle + paragraph locator
  ├─ Nodes from Schema 4: deduplicate legal rules/tests
  │   → create LegalRule/Test nodes linked to block provenance
  ├─ Labels from Schema 1: attach rhetorical_function as node metadata on blocks
  ├─ Taxonomy from Schema 5: create topic classification edges
  └─ Cross-case links: shared entities across cases → implicit CROSSWALK edges
      (analogous to Learning Commons' Jaccard-based crosswalks over shared LCs)
```

The assembled KG has these node and edge types:

**Nodes:**

| Node type | Source | Example |
|:--|:--|:--|
| Case | One per SCDB case, attributes from 55 SCDB columns + Fowler + MQ | *Marbury v. Madison*, 5 U.S. 137 |
| Block | One per paragraph, with `block_uid`, rhetorical function, content | `d7c41e...:8` — rule_statement |
| LegalPrinciple | Deduplicated from Schema 4 `legal_principle` across blocks | "A legal abandonment puts the underwriter in the place of the assured" |
| Party | Deduplicated from Schema 2 `parties` across blocks | "Chesapeake Insurance Company" |
| Judge | From Schema 2 + `justice_lookup` table | "Marshall, CJ" |
| Statute | Deduplicated from Schema 2 `statutes` + Schema 3 `statutes_cited` | "42 U.S.C. § 1983" |
| Topic | From Schema 5 `primary_topic` | "commercial" |

**Edges:**

| Edge type | From → To | Source |
|:--|:--|:--|
| `HAS_BLOCK` | Case → Block | Reading order (`block_index`) |
| `CITES` | Block → Case | Schema 3, with treatment + principle |
| `STATES` | Block → LegalPrinciple | Schema 4 |
| `MENTIONS` | Block → Party / Judge / Statute | Schema 2 |
| `AUTHORED_BY` | Case → Judge | Schema 2 + `justice_lookup` join |
| `CLASSIFIED_AS` | Block → Topic | Schema 5 |
| `SHEPARDS_TREATMENT` | Case → Case | Existing `shepards_edges` table (5.7M rows) |
| `CROSSWALK` | Case ↔ Case | Computed: Jaccard over shared entities across cases |

### Joining block-level extractions back to legal-10

The join between the platform's JSONL exports and the existing legal-10 database is deterministic:

```
Each .md file is named by SCDB caseId
  → caseId joins to scdb_cases (all 55 metadata columns)
  → caseId joins to fowler_scores (authority ranking)
  → usCite (from scdb_cases) joins to shepards_edges (5.7M treatments)

Each block's normalized_us_cite (from Schema 3)
  → joins to scdb_cases.usCite (cited case's full metadata)
  → joins to fowler_scores.lexisCite (cited case's authority score)
  → joins to shepards_edges (all other courts' treatment of the cited case)

Each block's judges[].name (from Schema 2)
  → joins to justice_lookup (justice ID)
  → joins to martin_quinn_scores (ideology score at time of authoring)
```

For every paragraph in every opinion, the researcher can query:

- The citations it makes (from Schema 3)
- The Fowler authority score of each cited case (from legal-10)
- The Shepard's treatment of each cited case by every other court in the system (from legal-10)
- The Martin-Quinn ideology of the authoring justice at the time they wrote the opinion (from legal-10)

All anchored to a specific `block_uid` with full provenance.

### What this gives the researcher

| Learning Commons query | SCOTUS KG equivalent |
|:--|:--|
| "Find standards aligned to CCSS 6.EE.B.5" | "Find all cases that cite *Marbury v. Madison*" |
| "What learning components support this standard?" | "What legal principles does this case articulate?" |
| "Show prerequisites for this standard" | "Show the citation chain leading to this holding" |
| "Crosswalk California to Common Core" | "Crosswalk 5th Circuit to Supreme Court on 4th Amendment search doctrine" |
| "Generate practice for prerequisite skills" | "Generate exam questions targeting the rule from *Miranda v. Arizona*" |

The result is a paragraph-addressable citation knowledge graph over the entire SCOTUS corpus — with provenance. Every node and edge traces back to a specific `block_uid`, a specific paragraph, a specific opinion. The SCDB provides 55 case-level variables. The Shepard's edges provide 5.7M case-to-case treatments. The platform's block-level extractions provide the paragraph layer that connects them.

---

## Use Case 3.5: Citation Polarity — Extending a Deterministic Pipeline with Block-Level AI

### The problem

The researcher from Use Case 3 has an additional challenge that illustrates a pattern common to many real-world use cases: **an existing deterministic pipeline that works well at one level of analysis but cannot reach the next level without AI comprehension**.

The existing pipeline extracts citation polarity (positive, negative, neutral) from Supreme Court opinions using two deterministic sources:

1. **Bluebook signal extraction** — regex-based detection of introductory signals (*see*, *but see*, *contra*, *cf.*, etc.) from the 30 characters preceding each citation occurrence in the opinion text
2. **Shepard's treatment classification** — editorial case-to-case treatment labels (followed, distinguished, overruled, etc.) from the `shepards_edges` table (5,711,699 rows)

Both operate at the case level or citation-occurrence level. Neither reads sentences. The researcher wants paragraph-level citation polarity that accounts for what the author *actually wrote* — not just what signal they used or what an editor classified after the fact.

### What the existing pipeline extracts (verified at scale)

The Bluebook signal extraction operates on all 378,938 citation occurrences in the corpus. Each citation's character position in the opinion text is known (from `citation_inventory`). The pipeline extracts the 30 characters before each citation, pattern-matches against the Bluebook introductory signal taxonomy (Bluebook Rules 1.2–1.6), and assigns a numeric stance value:

| Signal | Stance value | Polarity | Meaning |
|:--|:--|:--|:--|
| *e.g.* / no signal | +3.0 | positive | Direct support (Bluebook default) |
| *accord* | +2.5 | positive | Agreement across jurisdictions |
| *see* | +2.0 | positive | Clear indirect support |
| *see also* | +1.5 | positive | Additional support |
| *cf.* | +1.0 | positive | Analogous support |
| *see generally* | 0.0 | neutral | Background material |
| *but cf.* | -1.0 | negative | Analogous opposition |
| *but see* | -2.0 | negative | Clear opposition |
| *contra* | -3.0 | negative | Direct contradiction |

The verified distribution across 378,938 citations:

| Signal | Count | % | Polarity |
|:--|--:|--:|:--|
| no_signal | 343,212 | 90.6% | positive (default) |
| see | 19,356 | 5.1% | positive |
| cf | 6,445 | 1.7% | positive |
| eg | 4,352 | 1.1% | positive |
| see_also | 4,045 | 1.1% | positive |
| contra | 652 | 0.17% | negative |
| accord | 402 | 0.11% | positive |
| see_generally | 202 | 0.05% | neutral |
| but_see | 177 | 0.05% | negative |
| but_cf | 95 | 0.03% | negative |

This pipeline is deterministic, fast, and reproducible. It correctly identifies the 9.4% of citations with explicit Bluebook signals.

When cross-referenced with Shepard's treatment data (~232,000 Supreme Court-to-Supreme Court treatments), **1,013 citations show disagreement**: Shepard's classifies the treatment as *distinguished* (negative), but the Bluebook signal is either absent or positive.

### The 90.6% gap

90.6% of citations have no explicit Bluebook signal. By Bluebook convention, the absence of a signal means direct support — and this is the correct default for most citations. But it collapses meaningful variation:

- A paragraph that cites *Marbury v. Madison* to establish jurisdiction and one that cites it as the foundational principle of judicial review both show `no_signal, +3.0`. The *treatment purpose* is entirely different — one is procedural, the other is doctrinal authority.

- A paragraph that says "The Court in *Brown* held that..." and one that says "Although *Brown* established..." both show `no_signal, +3.0`. But "although" introduces a concessive clause — the syntactic framing carries treatment signal that lives outside the 30-character extraction window and requires sentence comprehension.

- The 1,013 Bluebook/Shepard's disagreement cases are exactly where the author doesn't flag negative treatment with a Bluebook signal but the editorial classification identifies it. An AI reading the full paragraph could resolve which assessment is correct — and provide the reasoning.

- The parenthetical extraction in the existing pipeline captures text in parentheses after citations (e.g., "(holding that warrantless searches violate the Fourth Amendment)"). It captures the string but cannot interpret it. "(holding that...)" is a principle statement; "(discussing the history of...)" is background reference. These have different polarity implications that require comprehension.

Three capabilities the deterministic pipeline cannot provide:

1. **Treatment purpose** — *why* the author cited this case in this paragraph (as authority for a holding? factual analogy? background context? string-cite filler?)
2. **Semantic polarity from sentence context** — the author's actual stance, derived from the full sentence rather than from a signal keyword
3. **Polarity reasoning** — an auditable explanation of why a particular polarity was assigned, especially when it differs from the Bluebook signal's implied polarity

These require reading the sentence. That is a block-level AI task.

### The schema: `scotus_citation_polarity_v1`

This schema extends the existing pipeline at the paragraph level. Each block is one paragraph; the schema asks the AI worker to identify every citation in that paragraph and classify it with the granularity that regex and Shepard's cannot reach.

The schema embeds the Bluebook signal taxonomy as `reference_material` so workers classify signals consistently with the existing pipeline — the AI extraction extends the deterministic results, not replaces them.

```json
{
  "schema_ref": "scotus_citation_polarity_v1",
  "description": "Per-block citation polarity extraction: Bluebook signals, treatment purpose, quoted passage attribution, and author stance for every citation in every paragraph of a Supreme Court opinion.",
  "reference_material": {
    "bluebook_signal_taxonomy": [
      { "signal": "e.g.", "stance": 3.0, "polarity": "positive", "meaning": "Direct support" },
      { "signal": "accord", "stance": 2.5, "polarity": "positive", "meaning": "Agreement across jurisdictions" },
      { "signal": "see", "stance": 2.0, "polarity": "positive", "meaning": "Clear indirect support" },
      { "signal": "see also", "stance": 1.5, "polarity": "positive", "meaning": "Additional support" },
      { "signal": "cf.", "stance": 1.0, "polarity": "positive", "meaning": "Analogous support" },
      { "signal": "see generally", "stance": 0.0, "polarity": "neutral", "meaning": "Background material" },
      { "signal": "but cf.", "stance": -1.0, "polarity": "negative", "meaning": "Analogous opposition" },
      { "signal": "but see", "stance": -2.0, "polarity": "negative", "meaning": "Clear opposition" },
      { "signal": "contra", "stance": -3.0, "polarity": "negative", "meaning": "Direct contradiction" },
      { "signal": "no_signal", "stance": 3.0, "polarity": "positive_default", "meaning": "Direct support (Bluebook default)" }
    ],
    "treatment_purpose_taxonomy": [
      "authority_for_holding",
      "authority_for_standard",
      "factual_analogy",
      "factual_distinction",
      "procedural_history",
      "background_context",
      "overruled_or_superseded",
      "narrowing_or_limiting",
      "extending_or_broadening",
      "string_cite_filler"
    ],
    "instructions_note": "The Bluebook signal taxonomy and treatment purpose taxonomy are provided as reference. Use the signal taxonomy to classify the Bluebook signal exactly as the regex pipeline would. Use the treatment purpose taxonomy to classify why the author cited this case — this is the field the regex pipeline cannot produce."
  },
  "instructions": "You are analyzing one paragraph of a US Supreme Court majority opinion. Identify every case citation in this paragraph. For each citation, extract the Bluebook signal (if any), determine the treatment purpose from full sentence context, and assess the author's actual stance. If this paragraph contains no citations, return an empty array for citations_in_block.",
  "fields": {
    "citations_in_block": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "citation_as_written": { "type": "string", "description": "The citation as it appears in the text." },
          "normalized_us_cite": { "type": "string|null", "description": "Normalized to U.S. Reports format (e.g., '347 U.S. 483') if identifiable." },
          "bluebook_signal": {
            "type": "string",
            "enum": ["eg", "accord", "see", "see_also", "cf", "see_generally", "but_cf", "but_see", "contra", "no_signal"],
            "description": "The Bluebook introductory signal preceding this citation, per the reference taxonomy."
          },
          "stance_value": { "type": "number", "description": "Numeric stance from the Bluebook taxonomy (-3.0 to +3.0)." },
          "treatment_purpose": {
            "type": "string",
            "enum": ["authority_for_holding", "authority_for_standard", "factual_analogy", "factual_distinction", "procedural_history", "background_context", "overruled_or_superseded", "narrowing_or_limiting", "extending_or_broadening", "string_cite_filler"],
            "description": "Why the author cited this case in this paragraph — the field the regex pipeline cannot produce."
          },
          "principle_cited_for": { "type": "string|null", "description": "The legal proposition this citation supports, in one sentence." },
          "quoted_passage": { "type": "string|null", "description": "If the paragraph quotes language from the cited case, the quoted text." },
          "semantic_polarity": {
            "type": "string",
            "enum": ["positive", "negative", "neutral", "mixed"],
            "description": "The author's actual stance toward this cited case based on full sentence context."
          },
          "polarity_reasoning": { "type": "string", "description": "One sentence explaining the semantic_polarity assignment. Critical when semantic_polarity differs from the Bluebook signal's implied polarity." }
        }
      },
      "description": "All case citations appearing in this paragraph."
    },
    "block_citation_count": { "type": "integer", "description": "Number of distinct citations in this paragraph." },
    "block_has_negative_citation": { "type": "boolean", "description": "True if any citation has semantic_polarity = negative." },
    "block_dominant_polarity": {
      "type": "string",
      "enum": ["positive", "negative", "neutral", "mixed", "none"],
      "description": "The overall citation polarity of this paragraph. 'none' if no citations present."
    }
  }
}
```

### Relationship to Use Case 3

This schema is a deeper, more targeted version of Schema 3 (`scotus_citations_v1`) from Use Case 3. It can be run alongside the five KG schemas as a sixth layer — the immutable blocks do not change between runs. The researcher might run the five KG schemas first for breadth, then run `scotus_citation_polarity_v1` for depth on the citation dimension.

This demonstrates an important platform property: **schemas can be refined iteratively**. Run a broad schema, examine the results, design a deeper schema, run it on the same blocks. Each run produces a new JSONL export. The immutable substrate is stable throughout.

### Steps 1–3: Blocks already exist

The 420,000 immutable blocks were created in Use Case 3, Step 1. The researcher creates new runs binding `scotus_citation_polarity_v1` to each of the 28,000 documents. The platform creates 420,000 pending overlay rows. Workers process them concurrently, the same way they processed the five KG schemas.

### Step 4: Exported result

**Block 8** of *Columbian Insurance v. Ashby* — the paragraph citing *Chesapeake v. Stark*:

```json
{
  "immutable": {
    "source_upload": { "source_uid": "a3f29b...", "source_type": "md" },
    "conversion": { "conv_uid": "d7c41e...", "conv_parsing_tool": "mdast" },
    "block": {
      "block_uid": "d7c41e...:8",
      "block_index": 8,
      "block_type": "paragraph",
      "block_locator": { "type": "text_offset_range", "start_offset": 3200, "end_offset": 3890 },
      "block_content": "In the case of Chesapeake Insurance Company v. Stark, 6 Cranch 272, this Court lays down the general rule that if an abandonment be legally made, it puts the underwriter completely in the place of the assured, and the agent of the latter becomes the agent of the former, and that the acts of the agent interfering with the subject insured will not affect the abandonment. But the Court takes a distinction between the acts of an agent and the acts of the assured; that in the latter case, any acts of ownership by the owner himself might be construed into a relinquishment of an abandonment which had not been accepted."
    }
  },
  "user_defined": {
    "schema_ref": "scotus_citation_polarity_v1",
    "schema_uid": "p7q8r9...",
    "data": {
      "citations_in_block": [
        {
          "citation_as_written": "Chesapeake Insurance Company v. Stark, 6 Cranch 272",
          "normalized_us_cite": "10 U.S. 272",
          "bluebook_signal": "no_signal",
          "stance_value": 3.0,
          "treatment_purpose": "authority_for_holding",
          "principle_cited_for": "A legal abandonment puts the underwriter in the place of the assured; the agent's acts do not affect the abandonment, but acts of ownership by the assured himself may constitute relinquishment.",
          "quoted_passage": null,
          "semantic_polarity": "positive",
          "polarity_reasoning": "The authoring court adopts the cited rule directly ('this Court lays down the general rule that...') and applies both its main principle and its distinction to the present facts."
        }
      ],
      "block_citation_count": 1,
      "block_has_negative_citation": false,
      "block_dominant_polarity": "positive"
    }
  }
}
```

This case is straightforward — the existing pipeline would correctly assign `no_signal, +3.0, positive`. The value of the schema extraction is the `treatment_purpose` (authority_for_holding) and the `principle_cited_for`, neither of which the regex can produce.

Now consider a paragraph where the existing pipeline hits its limit — one where the author distinguishes a case without using a negative Bluebook signal:

```json
{
  "immutable": {
    "block": {
      "block_uid": "f8e23a...:12",
      "block_index": 12,
      "block_type": "paragraph",
      "block_content": "We reaffirm the principle established in Miranda v. Arizona, 384 U.S. 436, that custodial interrogation requires prior warnings. The State urges us to follow Harris v. New York, 401 U.S. 222, but that case addressed the use of statements for impeachment, not their admissibility in the prosecution's case-in-chief. Harris is distinguishable on its facts and does not control here."
    }
  },
  "user_defined": {
    "schema_ref": "scotus_citation_polarity_v1",
    "schema_uid": "p7q8r9...",
    "data": {
      "citations_in_block": [
        {
          "citation_as_written": "Miranda v. Arizona, 384 U.S. 436",
          "normalized_us_cite": "384 U.S. 436",
          "bluebook_signal": "no_signal",
          "stance_value": 3.0,
          "treatment_purpose": "authority_for_holding",
          "principle_cited_for": "Custodial interrogation requires prior warnings.",
          "quoted_passage": null,
          "semantic_polarity": "positive",
          "polarity_reasoning": "The court explicitly reaffirms Miranda's principle ('We reaffirm the principle established in...')."
        },
        {
          "citation_as_written": "Harris v. New York, 401 U.S. 222",
          "normalized_us_cite": "401 U.S. 222",
          "bluebook_signal": "no_signal",
          "stance_value": 3.0,
          "treatment_purpose": "factual_distinction",
          "principle_cited_for": null,
          "quoted_passage": null,
          "semantic_polarity": "negative",
          "polarity_reasoning": "Despite no negative Bluebook signal, the court explicitly distinguishes Harris ('Harris is distinguishable on its facts and does not control here'). The regex pipeline assigns both citations no_signal/+3.0; sentence-level reading reveals the second is negative."
        }
      ],
      "block_citation_count": 2,
      "block_has_negative_citation": true,
      "block_dominant_polarity": "mixed"
    }
  }
}
```

This is exactly the pattern the 1,013 Bluebook/Shepard's disagreements represent. The regex pipeline assigns `no_signal, +3.0` to both citations. Shepard's might classify the *Harris* treatment as "distinguished" — but only at the case level, without paragraph context or reasoning. The schema extraction resolves it at the paragraph level with an auditable reasoning chain: *which sentence* distinguishes the case, and *why* the semantic polarity is negative despite the absence of a negative Bluebook signal.

### The join: block-level AI output meets legal-10

Every `normalized_us_cite` in the schema output is a join key into the existing legal-10 database:

```
user_defined.data.citations_in_block[].normalized_us_cite
  → JOIN scdb_cases ON usCite
      → 55 SCDB metadata columns for the cited case
      → issueArea, decisionDirection, majVotes, minVotes, chief, etc.
  → JOIN fowler_scores ON lexisCite
      → auth_score (citation authority ranking)
  → JOIN shepards_edges ON cited_lexis
      → All treatments of the cited case by every court in the system
      → COMPARE: schema's semantic_polarity vs. Shepard's treatment
  → JOIN martin_quinn_scores ON justice + term
      → Ideology of the authoring justice and the cited case's author
```

A single query chain gives the researcher, for every citation in every paragraph:

- **Who cited it, when, and with what stance** (from schema extraction — `treatment_purpose`, `semantic_polarity`, `polarity_reasoning`)
- **The cited case's full metadata** (from SCDB: issue area, vote split, disposition)
- **The cited case's authority score** (from Fowler)
- **How every other court has treated the cited case** (from Shepard's 5.7M edges)
- **The ideological distance between the citing and cited justice** (from Martin-Quinn)

All anchored to a specific `block_uid` — paragraph-level provenance that no existing legal dataset provides.

### What blocks add that SQL cannot

The existing pipeline and the block-level schema extraction are complementary, not competing. The pipeline provides speed, reproducibility, and coverage on the 9.4% of citations with explicit signals. The schema provides comprehension for the 90.6% that the pipeline can only assign defaults to.

| Capability | Existing pipeline (regex + Shepard's) | Block-level schema (AI) |
|:--|:--|:--|
| Signal detection (*see*, *but see*, *cf.*) | Yes — fast, deterministic, verified | Yes — reproduces the same classification |
| Treatment purpose (*why* a case is cited) | No — cannot read sentences | Yes — `treatment_purpose` field |
| Semantic polarity from context | No — defaults to Bluebook convention | Yes — `semantic_polarity` from full sentence |
| Disagreement resolution (Bluebook vs. Shepard's) | Cannot resolve — two independent sources | Yes — `polarity_reasoning` provides auditable tiebreaker |
| Quoted passage attribution | Partial — captures parenthetical text, cannot interpret it | Yes — `quoted_passage` with principle attribution |
| Paragraph-level provenance | No — operates at citation-occurrence offset | Yes — every extraction anchored to `block_uid` |

The schema output does not replace the existing pipeline — it extends it. The researcher can validate the schema's Bluebook signal classifications against the verified regex results (they should match on the 9.4% with explicit signals). Where they diverge, the disagreement itself is informative. And the `treatment_purpose`, `semantic_polarity`, and `polarity_reasoning` fields create an entirely new layer of analysis that the deterministic pipeline cannot reach at any scale.

---

## Use Case 4: Reviewing a 45-Page Master Service Agreement (DOCX via Docling)

### The problem

A general counsel at a mid-size technology company receives a 45-page Master Service Agreement (MSA) from a vendor. The MSA governs cloud infrastructure services over a three-year term. Before the company signs, the general counsel needs to:

1. **Identify every obligation** — who must do what, by when, under what conditions
2. **Flag risk clauses** — limitation of liability caps, indemnification triggers, unilateral termination rights, auto-renewal traps, broad IP assignment language
3. **Map defined terms** — the MSA defines 40+ capitalized terms in Section 1 and uses them throughout; the general counsel needs to know which terms appear in which clauses
4. **Extract cross-references** — the MSA refers internally to other sections ("subject to Section 8.3", "as defined in Exhibit B"); the general counsel needs the reference graph
5. **Catalog deadlines and notice periods** — cure periods, notice windows, renewal opt-out deadlines, SLA credit claim windows

Reading a 45-page MSA closely enough to extract all five categories takes a senior associate 6–10 hours. The general counsel has three MSAs to review this week. The obstacle is not complexity per clause — each clause can be analyzed independently — but volume. There are roughly 180 clauses across the document, each one needing the same five analyses applied.

### Why this is a block-level problem

Contract clauses are self-contained units. Section 7.2 ("Limitation of Liability") can be analyzed for risk independently of Section 3.1 ("Service Descriptions"). The defined terms in a clause are identifiable from the clause text alone (capitalized terms that match the definition list). Cross-references are explicit strings ("Section 8.3"). Deadlines are stated in the clause ("within thirty (30) days of written notice").

What the general counsel needs is a way to apply the same analytical standard to every clause independently, then aggregate the results into a risk matrix, an obligation register, and a cross-reference map. That is exactly what blocks give you.

### The source text (illustration)

The MSA is a Word document: `Vendor-MSA-2026-CloudInfra-v3.2.docx`. Unlike the `.md` files in Use Cases 1–3, this document cannot be parsed with mdast — it is a binary format. This is the first use case to go through the **Docling track**.

Representative clauses from the MSA:

> **Section 1.15** "Confidential Information" means any information disclosed by either Party to the other Party, directly or indirectly, in writing, orally, or by inspection, that is designated as "Confidential" or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.
>
> **Section 5.2** Provider shall maintain commercially reasonable administrative, physical, and technical safeguards designed to protect Client Data against unauthorized access, destruction, use, modification, or disclosure. Provider shall notify Client in writing within seventy-two (72) hours of discovering any Security Incident affecting Client Data. Upon Client's request, Provider shall provide a written root-cause analysis within thirty (30) days of the Security Incident.
>
> **Section 7.2** IN NO EVENT SHALL EITHER PARTY'S AGGREGATE LIABILITY UNDER THIS AGREEMENT EXCEED THE TOTAL FEES PAID OR PAYABLE BY CLIENT DURING THE TWELVE (12) MONTH PERIOD IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM. THIS LIMITATION SHALL NOT APPLY TO (A) PROVIDER'S INDEMNIFICATION OBLIGATIONS UNDER SECTION 8.1, (B) BREACHES OF SECTION 5 (DATA PROTECTION), OR (C) EITHER PARTY'S GROSS NEGLIGENCE OR WILLFUL MISCONDUCT.
>
> **Section 9.1** This Agreement shall commence on the Effective Date and continue for an initial term of three (3) years ("Initial Term"). Upon expiration of the Initial Term, this Agreement shall automatically renew for successive one (1) year periods ("Renewal Terms") unless either Party provides written notice of non-renewal at least ninety (90) days prior to the expiration of the then-current term.
>
> **Section 11.4(c)** Client may terminate this Agreement immediately upon written notice if Provider (i) materially breaches Section 5 (Data Protection) and fails to cure such breach within fifteen (15) days of written notice, (ii) becomes subject to any bankruptcy or insolvency proceeding, or (iii) assigns this Agreement without Client's prior written consent in violation of Section 12.3.

The full MSA has ~180 such clauses organized across 14 sections plus 3 exhibits.

### Step 1: Upload and ingest (Docling track — non-MD)

The general counsel uploads `Vendor-MSA-2026-CloudInfra-v3.2.docx`. The platform detects a `.docx` file and routes it through the **Docling conversion pipeline** (not mdast):

```
Upload .docx → Docling conversion → DoclingDocument JSON → block extraction
```

This is the ingestion path defined in `blocks.md` for non-Markdown formats. Docling parses the Word document's internal structure — headings, numbered paragraphs, tables, page headers/footers — and produces a DoclingDocument JSON representation. The platform then extracts blocks from this representation.

The immutable envelope reflects the Docling track:

```json
{
  "immutable": {
    "source_upload": {
      "source_uid": "7a2c9f...64-char-hex",
      "source_type": "docx",
      "source_filesize": 284672,
      "source_total_characters": null,
      "source_upload_timestamp": "2026-02-07T09:00:00Z"
    },
    "conversion": {
      "conv_status": "success",
      "conv_uid": "e3b8d1...64-char-hex",
      "conv_parsing_tool": "docling",
      "conv_representation_type": "doclingdocument_json",
      "conv_total_blocks": 214,
      "conv_block_type_freq": {
        "heading": 18,
        "paragraph": 162,
        "list_item": 24,
        "table": 6,
        "page_header": 2,
        "page_footer": 2
      },
      "conv_total_characters": 89340
    }
  }
}
```

Key differences from the mdast track (Use Cases 1–3):

| | mdast track (Use Cases 1–3) | Docling track (this use case) |
|:--|:--|:--|
| `source_type` | `md` | `docx` |
| `source_total_characters` | integer (text is readable from source bytes) | `null` (binary format — character count is not meaningful pre-conversion) |
| `conv_parsing_tool` | `mdast` | `docling` |
| `conv_representation_type` | `markdown_bytes` | `doclingdocument_json` |
| `block_locator.type` | `text_offset_range` | `docling_json_pointer` |

And one representative block — Section 5.2 (Data Protection obligations):

```json
{
  "immutable": {
    "source_upload": { "...same as above..." },
    "conversion": { "...same as above..." },
    "block": {
      "block_uid": "e3b8d1...:47",
      "block_index": 47,
      "block_type": "paragraph",
      "block_locator": { "type": "docling_json_pointer", "pointer": "#/texts/47", "page_no": 12 },
      "block_content": "Provider shall maintain commercially reasonable administrative, physical, and technical safeguards designed to protect Client Data against unauthorized access, destruction, use, modification, or disclosure. Provider shall notify Client in writing within seventy-two (72) hours of discovering any Security Incident affecting Client Data. Upon Client's request, Provider shall provide a written root-cause analysis within thirty (30) days of the Security Incident."
    }
  },
  "user_defined": {
    "schema_ref": null,
    "schema_uid": null,
    "data": {}
  }
}
```

The `block_locator` now uses `docling_json_pointer` — a JSON-pointer-like reference into the DoclingDocument JSON, with an optional `page_no` field. This is the pairing rule defined in `immutable-fields.md`: `conv_representation_type = doclingdocument_json` → `block_locator.type` MUST be `docling_json_pointer`.

214 blocks. Each one is an independent unit of work.

### Step 2: Create a user-defined schema

The general counsel creates a schema artifact that combines all five analysis tasks. The schema includes a `reference_material` key containing the MSA's defined terms list so that every AI worker can identify capitalized defined terms consistently. The platform stores the entire artifact as opaque JSON.

```json
{
  "schema_ref": "contract_clause_review_v1",
  "description": "Per-block contract clause analysis: obligations, risk flags, defined terms, cross-references, and deadlines for a Master Service Agreement.",
  "reference_material": {
    "defined_terms_list": [
      "Agreement", "Authorized User", "Business Day", "Change Order",
      "Client", "Client Data", "Confidential Information", "Deliverable",
      "Disclosing Party", "Effective Date", "Exhibits", "Fees",
      "Force Majeure Event", "Governing Law", "Initial Term",
      "Intellectual Property", "Law", "Liability Cap", "Losses",
      "Material Breach", "Non-Renewal Notice Period", "Party",
      "Personal Data", "Provider", "Provider Materials", "Receiving Party",
      "Renewal Term", "Representatives", "Security Incident",
      "Service Credits", "Service Level Agreement", "Services",
      "SLA", "Statement of Work", "Subprocessor", "Term",
      "Termination for Cause", "Termination for Convenience",
      "Third-Party Claims", "Work Product"
    ],
    "note": "The defined terms above are extracted from Section 1 (Definitions) of the MSA. Workers should flag any capitalized term from this list that appears in the block."
  },
  "instructions": "You are analyzing one clause of a 45-page Master Service Agreement between a technology company (Client) and a cloud infrastructure provider (Provider). Read the clause text provided and fill in each field below. If a field does not apply to this clause, use null or an empty array as appropriate.",
  "fields": {
    "clause_type": {
      "type": "string",
      "enum": [
        "definition", "scope_of_services", "service_level",
        "payment_and_fees", "data_protection", "confidentiality",
        "intellectual_property", "limitation_of_liability",
        "indemnification", "warranty", "termination",
        "force_majeure", "governing_law", "assignment",
        "notice", "general_provision", "exhibit_reference",
        "recital", "other"
      ],
      "description": "The primary category of this clause.",
      "instructions": "Classify the dominant purpose. If a clause spans multiple categories (e.g., a termination clause that references indemnification), classify by the clause's primary subject matter."
    },
    "obligations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "obligated_party": { "type": "string", "enum": ["Client", "Provider", "Both", "Neither"] },
          "obligation_text": { "type": "string", "description": "The specific obligation stated, in one sentence." },
          "obligation_type": { "type": "string", "enum": ["shall_do", "shall_not_do", "may_do", "condition_precedent"] },
          "trigger_condition": { "type": "string|null", "description": "What activates this obligation (e.g., 'upon discovery of a Security Incident', 'upon Client's request')." }
        }
      },
      "description": "Every obligation stated in this clause.",
      "instructions": "Identify each distinct obligation. 'Shall' = mandatory duty. 'Shall not' = prohibition. 'May' = permissive right. A single clause may contain multiple obligations (e.g., Section 5.2 contains three: maintain safeguards, notify within 72 hours, provide root-cause analysis)."
    },
    "risk_flags": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "flag": { "type": "string", "description": "Short label for the risk." },
          "severity": { "type": "string", "enum": ["high", "medium", "low"] },
          "explanation": { "type": "string", "description": "Why this is a risk, in one sentence." },
          "favors": { "type": "string", "enum": ["Client", "Provider", "Neutral"] }
        }
      },
      "description": "Risk factors in this clause from the Client's perspective.",
      "instructions": "Flag clauses that allocate risk: liability caps, broad indemnities, unilateral termination rights, auto-renewal with short opt-out windows, unlimited IP assignments, waiver of consequential damages, force majeure breadth. Severity: high = could expose Client to significant financial or operational risk; medium = non-standard but manageable; low = minor concern."
    },
    "defined_terms_used": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Capitalized defined terms from the reference list that appear in this clause.",
      "instructions": "Match capitalized terms in the block content against the defined_terms_list in reference_material. Only include terms that actually appear in this clause's text."
    },
    "cross_references": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "reference_text": { "type": "string", "description": "The cross-reference as written (e.g., 'Section 8.1', 'Exhibit B')." },
          "context": { "type": "string", "description": "Why this clause references the other section, in a few words (e.g., 'exception to liability cap', 'defined in')." }
        }
      },
      "description": "Internal cross-references to other sections or exhibits.",
      "instructions": "Identify every explicit reference to another section, subsection, or exhibit. Capture the reference string and the reason for the reference."
    },
    "deadlines": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "period": { "type": "string", "description": "The time period or deadline as stated (e.g., 'seventy-two (72) hours', 'ninety (90) days')." },
          "event": { "type": "string", "description": "What must happen within this period." },
          "responsible_party": { "type": "string", "enum": ["Client", "Provider", "Both", "Either"] }
        }
      },
      "description": "Time-bound obligations, notice periods, cure windows, and deadlines.",
      "instructions": "Extract every time period, deadline, or notice window stated in this clause. Include cure periods, response windows, opt-out deadlines, and renewal notice periods."
    }
  }
}
```

The platform stores this and computes:
- `schema_ref`: `contract_clause_review_v1`
- `schema_uid`: `sha256(canonical JSON bytes of the schema artifact)`

### Step 3: Create a run and process

The general counsel creates a run binding `contract_clause_review_v1` to the MSA's `conv_uid`. The platform creates 214 pending overlay rows (one per block).

AI workers claim blocks. Each worker receives:
1. The block's `block_content` (one clause of the MSA)
2. The full schema artifact (including the 40-term defined terms list in `reference_material`)

The worker reads the clause, follows the schema's instructions, and fills in all six fields. Since every clause is an independent unit of work, workers process them concurrently across all 214 blocks.

### Step 4: Exported result

**Block 12** (Section 1.15 — a definition clause):

```json
{
  "immutable": {
    "source_upload": { "source_uid": "7a2c9f...", "source_type": "docx" },
    "conversion": { "conv_uid": "e3b8d1...", "conv_parsing_tool": "docling", "conv_representation_type": "doclingdocument_json" },
    "block": {
      "block_uid": "e3b8d1...:12",
      "block_index": 12,
      "block_type": "paragraph",
      "block_locator": { "type": "docling_json_pointer", "pointer": "#/texts/12", "page_no": 3 },
      "block_content": "\"Confidential Information\" means any information disclosed by either Party to the other Party, directly or indirectly, in writing, orally, or by inspection, that is designated as \"Confidential\" or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure."
    }
  },
  "user_defined": {
    "schema_ref": "contract_clause_review_v1",
    "schema_uid": "c4d5e6...",
    "data": {
      "clause_type": "definition",
      "obligations": [],
      "risk_flags": [
        {
          "flag": "Broad confidentiality scope",
          "severity": "medium",
          "explanation": "The 'reasonably should be understood' standard is subjective and may sweep in information neither party intended to protect, creating compliance burden.",
          "favors": "Neutral"
        }
      ],
      "defined_terms_used": ["Confidential Information", "Party"],
      "cross_references": [],
      "deadlines": []
    }
  }
}
```

**Block 47** (Section 5.2 — Data Protection, the three-obligation clause):

```json
{
  "immutable": {
    "block": {
      "block_uid": "e3b8d1...:47",
      "block_index": 47,
      "block_type": "paragraph",
      "block_locator": { "type": "docling_json_pointer", "pointer": "#/texts/47", "page_no": 12 },
      "block_content": "Provider shall maintain commercially reasonable administrative, physical, and technical safeguards designed to protect Client Data against unauthorized access, destruction, use, modification, or disclosure. Provider shall notify Client in writing within seventy-two (72) hours of discovering any Security Incident affecting Client Data. Upon Client's request, Provider shall provide a written root-cause analysis within thirty (30) days of the Security Incident."
    }
  },
  "user_defined": {
    "schema_ref": "contract_clause_review_v1",
    "schema_uid": "c4d5e6...",
    "data": {
      "clause_type": "data_protection",
      "obligations": [
        {
          "obligated_party": "Provider",
          "obligation_text": "Provider must maintain commercially reasonable administrative, physical, and technical safeguards to protect Client Data.",
          "obligation_type": "shall_do",
          "trigger_condition": null
        },
        {
          "obligated_party": "Provider",
          "obligation_text": "Provider must notify Client in writing within 72 hours of discovering any Security Incident affecting Client Data.",
          "obligation_type": "shall_do",
          "trigger_condition": "Upon discovery of a Security Incident affecting Client Data"
        },
        {
          "obligated_party": "Provider",
          "obligation_text": "Provider must provide a written root-cause analysis within 30 days of the Security Incident.",
          "obligation_type": "shall_do",
          "trigger_condition": "Upon Client's request"
        }
      ],
      "risk_flags": [
        {
          "flag": "Commercially reasonable standard",
          "severity": "medium",
          "explanation": "'Commercially reasonable' is a flexible standard that Provider defines in practice; Client may prefer specific security standards (SOC 2, ISO 27001) enumerated.",
          "favors": "Provider"
        },
        {
          "flag": "72-hour incident notification",
          "severity": "low",
          "explanation": "72 hours is standard and aligns with GDPR Article 33; no heightened risk here.",
          "favors": "Neutral"
        }
      ],
      "defined_terms_used": ["Provider", "Client", "Client Data", "Security Incident"],
      "cross_references": [],
      "deadlines": [
        {
          "period": "seventy-two (72) hours",
          "event": "Provider must notify Client of a Security Incident",
          "responsible_party": "Provider"
        },
        {
          "period": "thirty (30) days",
          "event": "Provider must deliver written root-cause analysis of the Security Incident",
          "responsible_party": "Provider"
        }
      ]
    }
  }
}
```

**Block 83** (Section 7.2 — Limitation of Liability, with carve-outs and cross-references):

```json
{
  "immutable": {
    "block": {
      "block_uid": "e3b8d1...:83",
      "block_index": 83,
      "block_type": "paragraph",
      "block_locator": { "type": "docling_json_pointer", "pointer": "#/texts/83", "page_no": 21 },
      "block_content": "IN NO EVENT SHALL EITHER PARTY'S AGGREGATE LIABILITY UNDER THIS AGREEMENT EXCEED THE TOTAL FEES PAID OR PAYABLE BY CLIENT DURING THE TWELVE (12) MONTH PERIOD IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM. THIS LIMITATION SHALL NOT APPLY TO (A) PROVIDER'S INDEMNIFICATION OBLIGATIONS UNDER SECTION 8.1, (B) BREACHES OF SECTION 5 (DATA PROTECTION), OR (C) EITHER PARTY'S GROSS NEGLIGENCE OR WILLFUL MISCONDUCT."
    }
  },
  "user_defined": {
    "schema_ref": "contract_clause_review_v1",
    "schema_uid": "c4d5e6...",
    "data": {
      "clause_type": "limitation_of_liability",
      "obligations": [
        {
          "obligated_party": "Both",
          "obligation_text": "Neither party's aggregate liability may exceed total fees paid or payable by Client in the 12 months preceding the claim.",
          "obligation_type": "shall_not_do",
          "trigger_condition": null
        }
      ],
      "risk_flags": [
        {
          "flag": "12-month trailing fee cap",
          "severity": "high",
          "explanation": "The liability cap is based on fees paid by Client, which means Client's maximum recovery is limited to what it has paid — Provider's exposure is capped at Client's own spend, not at Client's potential losses.",
          "favors": "Provider"
        },
        {
          "flag": "Carve-outs narrow but present",
          "severity": "medium",
          "explanation": "The three carve-outs (indemnification, data protection breaches, gross negligence/willful misconduct) are standard but should be verified against Sections 8.1 and 5 to confirm they are not themselves capped.",
          "favors": "Neutral"
        }
      ],
      "defined_terms_used": ["Agreement", "Party", "Client", "Fees", "Provider"],
      "cross_references": [
        {
          "reference_text": "Section 8.1",
          "context": "Exception to liability cap — Provider's indemnification obligations"
        },
        {
          "reference_text": "Section 5",
          "context": "Exception to liability cap — breaches of data protection"
        }
      ],
      "deadlines": [
        {
          "period": "twelve (12) month period",
          "event": "Look-back window for calculating the aggregate liability cap",
          "responsible_party": "Both"
        }
      ]
    }
  }
}
```

**Block 104** (Section 9.1 — Term and auto-renewal):

```json
{
  "immutable": {
    "block": {
      "block_uid": "e3b8d1...:104",
      "block_index": 104,
      "block_type": "paragraph",
      "block_locator": { "type": "docling_json_pointer", "pointer": "#/texts/104", "page_no": 27 },
      "block_content": "This Agreement shall commence on the Effective Date and continue for an initial term of three (3) years (\"Initial Term\"). Upon expiration of the Initial Term, this Agreement shall automatically renew for successive one (1) year periods (\"Renewal Terms\") unless either Party provides written notice of non-renewal at least ninety (90) days prior to the expiration of the then-current term."
    }
  },
  "user_defined": {
    "schema_ref": "contract_clause_review_v1",
    "schema_uid": "c4d5e6...",
    "data": {
      "clause_type": "termination",
      "obligations": [
        {
          "obligated_party": "Either",
          "obligation_text": "Either party must provide written notice of non-renewal at least 90 days before the current term expires to prevent auto-renewal.",
          "obligation_type": "condition_precedent",
          "trigger_condition": "Intent to prevent automatic renewal"
        }
      ],
      "risk_flags": [
        {
          "flag": "Auto-renewal with 90-day opt-out",
          "severity": "high",
          "explanation": "Auto-renewal is the default — missing the 90-day opt-out window locks Client into another full year. This is a calendar-management risk that should trigger automated reminders.",
          "favors": "Provider"
        }
      ],
      "defined_terms_used": ["Agreement", "Effective Date", "Initial Term", "Party", "Renewal Term"],
      "cross_references": [],
      "deadlines": [
        {
          "period": "three (3) years",
          "event": "Initial Term duration from Effective Date",
          "responsible_party": "Both"
        },
        {
          "period": "one (1) year",
          "event": "Each successive Renewal Term duration",
          "responsible_party": "Both"
        },
        {
          "period": "ninety (90) days",
          "event": "Written notice of non-renewal must be delivered before current term expires",
          "responsible_party": "Either"
        }
      ]
    }
  }
}
```

**Block 127** (Section 11.4(c) — Termination for cause, with cross-references and cascading conditions):

```json
{
  "immutable": {
    "block": {
      "block_uid": "e3b8d1...:127",
      "block_index": 127,
      "block_type": "paragraph",
      "block_locator": { "type": "docling_json_pointer", "pointer": "#/texts/127", "page_no": 32 },
      "block_content": "Client may terminate this Agreement immediately upon written notice if Provider (i) materially breaches Section 5 (Data Protection) and fails to cure such breach within fifteen (15) days of written notice, (ii) becomes subject to any bankruptcy or insolvency proceeding, or (iii) assigns this Agreement without Client's prior written consent in violation of Section 12.3."
    }
  },
  "user_defined": {
    "schema_ref": "contract_clause_review_v1",
    "schema_uid": "c4d5e6...",
    "data": {
      "clause_type": "termination",
      "obligations": [
        {
          "obligated_party": "Client",
          "obligation_text": "Client may terminate the Agreement immediately upon written notice for Provider's material data protection breach, insolvency, or unauthorized assignment.",
          "obligation_type": "may_do",
          "trigger_condition": "Provider materially breaches Section 5 and fails to cure within 15 days, or becomes insolvent, or assigns without consent"
        }
      ],
      "risk_flags": [
        {
          "flag": "15-day cure period for data breach",
          "severity": "medium",
          "explanation": "A 15-day cure period for data protection breaches is short but may still be too long for critical security incidents — consider whether immediate termination without cure is warranted for the most severe breach categories.",
          "favors": "Client"
        }
      ],
      "defined_terms_used": ["Agreement", "Client", "Provider", "Material Breach"],
      "cross_references": [
        {
          "reference_text": "Section 5",
          "context": "Data Protection — material breach of this section triggers termination right"
        },
        {
          "reference_text": "Section 12.3",
          "context": "Assignment restrictions — unauthorized assignment triggers termination right"
        }
      ],
      "deadlines": [
        {
          "period": "fifteen (15) days",
          "event": "Provider's cure period for material breach of Section 5 after written notice",
          "responsible_party": "Provider"
        }
      ]
    }
  }
}
```

### Aggregated outputs from one run

Because every block has a stable `block_uid` and `block_index`, the general counsel can extract five distinct outputs from the same JSONL export by reading different fields and aggregating. These outputs are derived views over the per-block JSONL export; they do not change `block_uid` or introduce a new canonical record type:

**Output 1 — Obligation register:**
Collect `user_defined.data.obligations` across all blocks. Group by `obligated_party`. The result is a complete register of who owes what to whom:

| Party | Obligation | Type | Trigger | Source clause |
|:--|:--|:--|:--|:--|
| Provider | Maintain commercially reasonable safeguards for Client Data | shall_do | — | Block 47, §5.2, p.12 |
| Provider | Notify Client of Security Incident within 72 hours | shall_do | Discovery of Security Incident | Block 47, §5.2, p.12 |
| Provider | Provide root-cause analysis within 30 days | shall_do | Client's request | Block 47, §5.2, p.12 |
| Client | Pay Fees within 30 days of invoice | shall_do | Receipt of invoice | Block 35, §4.1, p.9 |
| Either | Provide 90-day written notice to prevent auto-renewal | condition_precedent | Intent to prevent renewal | Block 104, §9.1, p.27 |

The general counsel sees every obligation in the contract in one table, grouped by responsible party.

**Output 2 — Risk heat map:**
Collect `user_defined.data.risk_flags` across all blocks. Sort by `severity` descending:

| Severity | Flag | Favors | Source clause |
|:--|:--|:--|:--|
| high | 12-month trailing fee cap | Provider | Block 83, §7.2, p.21 |
| high | Auto-renewal with 90-day opt-out | Provider | Block 104, §9.1, p.27 |
| high | Broad IP assignment for Work Product | Provider | Block 72, §6.3, p.18 |
| medium | Commercially reasonable security standard | Provider | Block 47, §5.2, p.12 |
| medium | Carve-outs narrow but present | Neutral | Block 83, §7.2, p.21 |
| medium | 15-day cure period for data breach | Client | Block 127, §11.4(c), p.32 |
| low | 72-hour incident notification | Neutral | Block 47, §5.2, p.12 |

The high-severity items become the negotiation agenda.

**Output 3 — Defined terms usage map:**
Collect `user_defined.data.defined_terms_used` per block. Build a reverse index:

| Defined term | Appears in blocks | Count |
|:--|:--|--:|
| Client Data | 47, 48, 49, 50, 83, 127, 142 | 7 |
| Security Incident | 47, 48, 50, 127 | 4 |
| Confidential Information | 12, 55, 56, 57, 58 | 5 |
| Agreement | 12, 47, 83, 104, 127, 140, 141, ... | 28 |

The general counsel can trace where each defined term is used, ensuring definitions match usage.

**Output 4 — Cross-reference graph:**
Collect `user_defined.data.cross_references` across all blocks. Build a directed graph:

```
Section 7.2 (Limitation of Liability)
  → Section 8.1 (exception: indemnification)
  → Section 5 (exception: data protection)

Section 11.4(c) (Termination for Cause)
  → Section 5 (trigger: material breach)
  → Section 12.3 (trigger: unauthorized assignment)

Section 8.1 (Indemnification)
  → Section 7.2 (not subject to liability cap)
  → Exhibit B (indemnification procedures)
```

Circular or orphaned references are immediately visible.

**Output 5 — Deadline and notice tracker:**
Collect `user_defined.data.deadlines` across all blocks. Sort by urgency:

| Period | Event | Responsible | Source clause |
|:--|:--|:--|:--|
| 72 hours | Notify Client of Security Incident | Provider | Block 47, §5.2 |
| 15 days | Cure period for material breach of §5 | Provider | Block 127, §11.4(c) |
| 30 days | Deliver root-cause analysis of Security Incident | Provider | Block 47, §5.2 |
| 30 days | Payment due after invoice | Client | Block 35, §4.1 |
| 90 days | Non-renewal notice before term expiration | Either | Block 104, §9.1 |
| 12 months | Look-back window for liability cap | Both | Block 83, §7.2 |
| 1 year | Each Renewal Term | Both | Block 104, §9.1 |
| 3 years | Initial Term | Both | Block 104, §9.1 |

This becomes the calendar integration — every deadline can be set as a reminder anchored to the clause that creates it.

### Why blocks solve the contract review problem

Without blocks, the general counsel has two options:

- **Read the entire MSA in one AI session** — the AI will lose context partway through a 45-page contract, apply inconsistent standards across clauses, and miss cross-references between distant sections.
- **Manually split the contract into chunks** — the general counsel spends hours copying clauses, tracking what was processed, and reassembling by hand. This defeats the purpose of using AI.

With blocks, the platform handles the decomposition deterministically (Docling parsing of the DOCX structure), each clause gets the same schema and the same defined-terms reference list, workers process independently, and the general counsel gets a JSONL file where every clause has the same six fields filled. Aggregation into the five outputs above is mechanical — filter, group, sort.

### Iterative schema refinement

After reviewing the first run's output, the general counsel notices that the indemnification clauses (Sections 8.1–8.4) are complex enough to warrant deeper analysis — the `risk_flags` field captures surface concerns, but the interplay between indemnification triggers, defense obligations, and settlement authority requires its own schema.

The general counsel creates a second schema — `contract_indemnity_deep_v1` — with fields for `indemnification_trigger`, `defense_obligation`, `settlement_authority`, `survival_clause`, and `insurance_requirement`. This second schema is run on the same 214 immutable blocks. The blocks do not change. Only the overlay changes.

This is the same pattern demonstrated in Use Case 3.5: run a broad schema for breadth, then run a targeted schema for depth on the dimension that matters most. The immutable substrate is stable throughout.

### In-Platform Experience (Web-First)

> **The general counsel does not export JSONL to review this contract.** The block viewer is the primary interface. The entire review happens in the browser.

**What the general counsel actually sees:**

The general counsel navigates to the document detail page for the uploaded MSA and selects the `contract_clause_review_v1` run. Six dynamic columns appear to the right of the immutable block columns:

| # | Type | Content (preview) | Page | Status | clause_type | obligations | risk_flags | defined_terms | cross_refs | deadlines |
|:--|:--|:--|:--|:--|:--|:--|:--|:--|:--|:--|
| 12 | paragraph | "Confidential Information" means any... | 3 | complete | definition | — | 1 flag (medium) | CI, Party | — | — |
| 47 | paragraph | Provider shall maintain commercially... | 12 | complete | data_protection | 3 obligations | 2 flags | Provider, Client, ... | — | 72h, 30d |
| 83 | paragraph | IN NO EVENT SHALL EITHER PARTY'S... | 21 | complete | limitation_of_liability | 1 obligation | 2 flags (1 high) | Agreement, Party, ... | §8.1, §5 | 12mo |
| 104 | paragraph | This Agreement shall commence on... | 27 | claimed | — | — | — | — | — | — |

**Real-time feedback:** The general counsel creates the run and watches clauses fill in as AI workers complete them. No waiting for the entire 214-block run to finish — the reviewer starts reading completed clauses immediately while remaining blocks are still processing.

**Interactive review — risk-first workflow:** The general counsel doesn't read clauses in document order. They:
1. Sort by `risk_flags` severity to surface the highest-risk clauses first
2. Click a high-severity row to expand it — the expanded view shows full clause text, all obligations with trigger conditions, all risk flags with explanations and party analysis, cross-references to other sections, and deadlines
3. Review the `cross_references` column to follow the web of dependencies between sections — clicking a cross-reference navigates to the referenced block

**Aggregated views — in the browser:**

The five outputs described above (obligation register, risk heat map, defined terms map, cross-reference graph, deadline tracker) are not post-export assembly exercises. They are in-platform views:

- **Obligation register tab:** Obligations collected from all blocks, grouped by `obligated_party`, each row linking back to the source clause
- **Risk heat map tab:** All risk flags sorted by severity, color-coded (red/yellow/green), with one-click navigation to the source clause
- **Deadline tracker tab:** All deadlines sorted by urgency, with responsible party and source clause — ready for calendar export

The general counsel works entirely in the browser. They never download a file.

**When JSONL export matters:** The general counsel exports JSONL only when they need to feed the contract review into an external system — a matter management platform, a compliance register, or an obligation tracking database. For the review itself, the web interface is the complete experience.

**Second schema, same blocks:** When the general counsel decides indemnification needs deeper analysis, they create `contract_indemnity_deep_v1` and start a new run — all in the browser. They switch between runs using the run selector dropdown. The same 214 blocks, two different overlay column sets, toggleable with one click.
