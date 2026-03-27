# Capability Spectra Across the 9-Family Structure

this following content will be an extra view to view our data. it does not replace our existing 12 question type structure

## The New 9 Families

| #   | Family                  | Merged From |
| --- | ----------------------- | ----------- |
| 1.x | Known Authority (KA)    | 1.x + 2.x   |
| 2.x | Canary                  | 3.x         |
| 3.x | Citation Integrity      | 4.x         |
| 4.x | Transitive Reasoning    | 5.x         |
| 5.x | IRAC Synthesis          | 6.x + 7.x   |
| 6.x | Reverse Citator (RC)    | 8.x         |
| 7.x | Fact Extraction (FE)    | 10.x        |
| 8.x | Edge Treatment          | 11.x + 9.x  |
| 9.x | Cross-Source Validation | 12.x        |

---

## Mirror Spectra Mapped to 9 Families

### Spectrum 1: EVIDENCE_AVAILABILITY

```
Presence ←――――――――――――――――――――――――――――→ Absence

   7.x                                    2.x
   Fact Extraction                        Canary
   (evidence provided,                    (evidence withheld,
   extract accurately)                    must refuse)
```

**Mirror Pairing:** `7.x ↔ 2.x`

---

### Spectrum 2: TRAVERSAL_DIRECTION

```
Forward ←――――――――――――――――――――――――――――→ Reverse

   1.x                                    6.x
   Known Authority                        Reverse Citator
   (anchor → its citations)               (precedent → its citers)
```

**Mirror Pairing:** `1.x ↔ 6.x`

---

### Spectrum 3: GRAPH_COMPOSITION

```
Local ←――――――――――――――――――――――――――――――→ Multi-hop

   8.x                                    4.x
   Edge Treatment                         Transitive Reasoning
   (single citing→cited edge)             (A→B→C inference)
```

**Mirror Pairing:** `8.x ↔ 4.x`

---

### Spectrum 4: DRAFTING_VERIFICATION

```
Generate ←――――――――――――――――――――――――――→ Verify

   5.x                                    3.x
   IRAC Synthesis                         Citation Integrity
   (create legal analysis)                (verify citations used)
```

**Mirror Pairing:** `5.x ↔ 3.x`

---

### Spectrum 5: SOURCE_CERTAINTY

```
Single Source ←―――――――――――――――――――――→ Multi-Source

   7.x / 8.x                              9.x
   Fact Extraction                        Cross-Source Validation
   Edge Treatment                         (compare Oyez vs SCDB,
   (one authoritative source)             flag conflicts)
```

**Mirror Pairing:** `7.x/8.x ↔ 9.x`

---

### Spectrum 6: SIGNAL_INTEGRATION (New)

```
Single Signal ←―――――――――――――――――――――→ Multi-Weighted

   1.x (simple)                           1.x (complex)
   SC-A1: "higher Fowler?"                MSI-2: polarity × authority × log(freq)
   SC-F1: "more frequent?"                CF-1: removal impact formula
```

**Mirror Pairing:** `1.x-simple ↔ 1.x-composite` (intra-family spectrum)

---

### Spectrum 7: TEMPORAL_REASONING (New)

```
Static ←―――――――――――――――――――――――――――→ Longitudinal

   7.x                                    6.x (temporal variants)
   Fact Extraction                        TEMP-1: treatment evolution
   (facts at decision time)               TEMP-2: authority trajectory
```

**Mirror Pairing:** `7.x ↔ 6.x-temporal`

---

### Spectrum 8: EPISTEMIC_CALIBRATION (New)

```
Confident Answer ←――――――――――――――――――→ Refusal/Flagging

   7.x / 1.x                              2.x / 9.x
   (evidence sufficient,                  Canary: must refuse
   answer definitively)                   Cross-Source: must flag conflict
```

**Mirror Pairing:** `7.x ↔ 2.x` and `8.x ↔ 9.x`

---

### Spectrum 9: INFERENCE_MODE (New)

```
Deductive ←―――――――――――――――――――――――――→ Inductive

   4.x                                    (excluded or reframed)
   Transitive Reasoning                   PRED-1, PRED-2
   (if A→B and B→C, then A→C)             (statistical pattern prediction)
```

**Mirror Pairing:** `4.x ↔ PRED-*` (if PRED templates are included)

---

### Spectrum 10: COUNTERFACTUAL_REASONING (New)

```
Factual ←――――――――――――――――――――――――――→ Hypothetical

   1.x (standard)                         1.x (counterfactual)
   "Which has highest authority?"         CF-1: "Which removal would
                                          most weaken the holding?"
```

**Mirror Pairing:** `1.x-factual ↔ 1.x-counterfactual` (intra-family spectrum)

---

### Spectrum 11: ANOMALY_DETECTION (New)

```
Typical ←――――――――――――――――――――――――――→ Outlier

   1.x (standard)                         1.x (anomaly)
   "Which is most authoritative?"         SC-SURPRISE1: "Which has
                                          high authority but negative
                                          treatment?"
```

**Mirror Pairing:** `1.x-typical ↔ 1.x-anomaly` (intra-family spectrum)

---

## Complete Matrix: Families × Spectra

| Family                | Evidence    | Traversal | Graph     | Draft/Verify | Source      | Signal   | Temporal | Epistemic | Inference | Counterfactual | Anomaly  |
| --------------------- | ----------- | --------- | --------- | ------------ | ----------- | -------- | -------- | --------- | --------- | -------------- | -------- |
| **1.x KA**            | PROVIDED    | FORWARD   | SET       | —            | SINGLE      | VARIABLE | STATIC   | CONFIDENT | FACTUAL   | VARIABLE       | VARIABLE |
| **2.x Canary**        | WITHHELD    | —         | —         | —            | SINGLE      | —        | STATIC   | REFUSAL   | —         | —              | —        |
| **3.x Citation Int.** | PROVIDED    | —         | —         | VERIFY       | SINGLE      | —        | STATIC   | CONFIDENT | —         | —              | —        |
| **4.x Transitive**    | PROVIDED    | COMPOSED  | MULTI-HOP | —            | SINGLE      | SINGLE   | STATIC   | CONFIDENT | DEDUCTIVE | —              | —        |
| **5.x IRAC**          | PROVIDED    | —         | —         | GENERATE     | SINGLE      | —        | STATIC   | CONFIDENT | —         | —              | —        |
| **6.x Reverse Cit.**  | PROVIDED    | REVERSE   | SET       | —            | SINGLE      | VARIABLE | VARIABLE | CONFIDENT | FACTUAL   | —              | —        |
| **7.x Fact Extr.**    | PROVIDED    | —         | —         | —            | SINGLE      | SINGLE   | STATIC   | CONFIDENT | FACTUAL   | —              | —        |
| **8.x Edge Treat.**   | PROVIDED    | —         | LOCAL     | —            | SINGLE/DUAL | SINGLE   | STATIC   | CONFIDENT | FACTUAL   | —              | —        |
| **9.x Cross-Source**  | CONFLICTING | —         | —         | —            | MULTI       | —        | STATIC   | FLAGGING  | —         | —              | CONFLICT |

---

## Visual: Where Each Family Sits on Key Spectra

### Evidence Availability

```
PROVIDED                                           WITHHELD
   |                                                  |
   1.x  3.x  4.x  5.x  6.x  7.x  8.x              2.x
   ├────┴────┴────┴────┴────┴────┴────┤              │
   └──────────────┬───────────────────┘              │
                  │                                  │
            Most families                        Canary
```

### Traversal Direction

```
FORWARD                    COMPOSED                 REVERSE
   |                          |                        |
  1.x                        4.x                      6.x
   │                          │                        │
   └── anchor → citations     └── A→B→C               └── precedent → citers
```

### Epistemic Demand

```
CONFIDENT                  CALIBRATED               REFUSAL/FLAG
   |                          |                        |
  1.x  4.x  5.x  6.x  7.x  8.x                      2.x  9.x
   ├────┴────┴────┴────┴────┴───┤                    ├────┴───┤
   └───────────────┬────────────┘                    └────┬───┘
                   │                                      │
         "Answer definitively"              "Refuse or flag conflict"
```

### Signal Complexity (Within 1.x)

```
SINGLE                     PAIRWISE                 MULTI-WEIGHTED
   |                          |                        |
 SC-A1                      MSI-1                    MSI-2
 SC-F1                   SC-SURPRISE1                CF-1
   │                          │                        │
"Which is higher?"    "Which diverges?"      "Rank by formula"
```

---

## Summary Table: 11 Spectra × Mirror Pairings

| #   | Spectrum              | End A     | End B        | Families Involved    |
| --- | --------------------- | --------- | ------------ | -------------------- |
| 1   | Evidence Availability | PROVIDED  | WITHHELD     | 7.x ↔ 2.x            |
| 2   | Traversal Direction   | FORWARD   | REVERSE      | 1.x ↔ 6.x            |
| 3   | Graph Composition     | LOCAL     | MULTI-HOP    | 8.x ↔ 4.x            |
| 4   | Drafting/Verification | GENERATE  | VERIFY       | 5.x ↔ 3.x            |
| 5   | Source Certainty      | SINGLE    | MULTI        | 7.x/8.x ↔ 9.x        |
| 6   | Signal Integration    | SINGLE    | COMPOSITE    | 1.x internal         |
| 7   | Temporal Reasoning    | STATIC    | LONGITUDINAL | 7.x ↔ 6.x-temporal   |
| 8   | Epistemic Calibration | CONFIDENT | REFUSAL      | 7.x ↔ 2.x, 8.x ↔ 9.x |
| 9   | Inference Mode        | DEDUCTIVE | INDUCTIVE    | 4.x ↔ (PRED-\*)      |
| 10  | Counterfactual        | FACTUAL   | HYPOTHETICAL | 1.x internal         |
| 11  | Anomaly Detection     | TYPICAL   | OUTLIER      | 1.x internal         |

---

## Key Observations

### Inter-Family Spectra (5 total)

These define relationships BETWEEN families:

| Spectrum     | Pairing       |
| ------------ | ------------- |
| Evidence     | 7.x ↔ 2.x     |
| Traversal    | 1.x ↔ 6.x     |
| Graph        | 8.x ↔ 4.x     |
| Draft/Verify | 5.x ↔ 3.x     |
| Source       | 7.x/8.x ↔ 9.x |

### Intra-Family Spectra (3 total)

These define variations WITHIN a family (primarily 1.x KA):

| Spectrum           | Within Family               |
| ------------------ | --------------------------- |
| Signal Integration | 1.x: simple ↔ composite     |
| Counterfactual     | 1.x: factual ↔ hypothetical |
| Anomaly Detection  | 1.x: typical ↔ outlier      |

### Cross-Cutting Spectra (3 total)

These apply across multiple families:

| Spectrum  | Families                          |
| --------- | --------------------------------- |
| Temporal  | 6.x, 7.x (could extend to others) |
| Epistemic | 2.x, 9.x vs all others            |
| Inference | 4.x vs excluded PRED-\*           |

---

## Implication for 1.x Known Authority

1.x is now the most internally complex family. It contains:

| Sub-Type          | Tag Values                               | Examples            |
| ----------------- | ---------------------------------------- | ------------------- |
| Simple comparison | signal: SINGLE, pattern: TYPICAL         | SC-A1, SC-F1        |
| Anomaly detection | signal: PAIRWISE, pattern: ANOMALY       | SC-SURPRISE1, MSI-1 |
| Composite ranking | signal: MULTI_WEIGHTED, pattern: TYPICAL | MSI-2               |
| Counterfactual    | counterfactual: REMOVAL_IMPACT           | CF-1                |

This justifies keeping them in one family (same unit of analysis: anchor's citations) while using tags to distinguish capability sub-types.

---

## Complete Tag Schema for 9-Family Structure

```yaml
# Primary Family Assignment
family: [
    1.x_KA | 2.x_CANARY | 3.x_CITATION_INT | 4.x_TRANSITIVE |
    5.x_IRAC | 6.x_REVERSE_CIT | 7.x_FACT_EXTR | 8.x_EDGE | 9.x_CROSS_SOURCE,
  ]

# Spectrum Tags
evidence_mode: [PROVIDED | WITHHELD | PARTIAL | CONFLICTING]
traversal_direction: [FORWARD | REVERSE | COMPOSED | NA]
graph_depth: [LOCAL | MULTI_HOP | SET_LEVEL | NA]
output_mode: [
    SELECTION | RANKING | EXTRACTION | CLASSIFICATION |
    PREDICTION | SYNTHESIS | VERIFICATION | DISCIPLINE,
  ]
source_mode: [SINGLE_SOURCE | DUAL_SOURCE | MULTI_SOURCE]
signal_complexity:
  [SINGLE | PAIRWISE_COMPARISON | MULTI_SIGNAL_WEIGHTED | HIERARCHICAL_GATED]
temporal_scope: [STATIC | CROSS_TEMPORAL | LONGITUDINAL_PATTERN]
epistemic_demand:
  [
    CONFIDENT_ANSWER | CALIBRATED_UNCERTAINTY | REFUSAL_REQUIRED | CONFLICT_FLAGGING,
  ]
reasoning_mode: [DEDUCTIVE | INDUCTIVE | ABDUCTIVE | FACTUAL]
counterfactual_mode:
  [FACTUAL | REMOVAL_IMPACT | SUBSTITUTION | HYPOTHETICAL_OUTCOME | NA]
pattern_type: [TYPICAL | ANOMALY_DETECTION | CONFLICT_DETECTION]

# Supplementary Tags
data_source: [SCOTUS | CAP | OYEZ | SCDB | SHEPARDS]
evidence_scope: [ANCHOR_ONLY | ANCHOR_PLUS_RP]
chain_dependence: [STANDALONE | DEPENDS_ON_PRIOR_STEP | END_OF_CHAIN]
```

---

## Decision Tree for Family Assignment (9-Family Version)

```
1. Does the model choose only from citations extracted from the anchor?
   YES → Family 1.x Known Authority
   NO → Continue

2. Are we testing refusal / "insufficient information" because
   evidence is withheld or partial?
   YES → Family 2.x Canary
   NO → Continue

3. Is it end-of-chain citation verification of a drafted output?
   YES → Family 3.x Citation Integrity
   NO → Continue

4. Is it multi-hop inference over citation graph edges (triangle/lineage)?
   YES → Family 4.x Transitive Reasoning
   NO → Continue

5. Is it judge-scored drafting/synthesis (IRAC)?
   YES → Family 5.x IRAC Synthesis
   NO → Continue

6. Is it reverse-citator retrieval/ranking (find citers of a precedent)?
   YES → Family 6.x Reverse Citator
   NO → Continue

7. Is it extracting closed-enum case outcome fields from
   admitted text/metadata?
   YES → Family 7.x Fact Extraction
   NO → Continue

8. Is it about a specific citing→cited edge treatment/classification?
   YES → Family 8.x Edge Treatment
   NO → Continue

9. Is it cross-source conflict checking where the model must
   flag conflict without resolving?
   YES → Family 9.x Cross-Source Validation
   NO → Review manually
```

---

## Template Count by Family (Estimated)

| Family                   | Template Count | Notes                                        |
| ------------------------ | -------------- | -------------------------------------------- |
| 1.x Known Authority      | ~22            | Includes all SC-_, CAP-_, MSI-_, CF-_        |
| 2.x Canary               | 4              | C1, C2, C-NONEXIST1, C-PARTIAL1              |
| 3.x Citation Integrity   | 1              | May expand                                   |
| 4.x Transitive Reasoning | 3              | TRANS-1, TRANS-2, TRANS-3                    |
| 5.x IRAC Synthesis       | 2              | With/without RP (tagged)                     |
| 6.x Reverse Citator      | 6              | RC-\*, TEMP-1, TEMP-2                        |
| 7.x Fact Extraction      | 4              | FE-\* templates                              |
| 8.x Edge Treatment       | 6              | CE-\* plus SC-P6-EXCERPT                     |
| 9.x Cross-Source         | 5              | C-CONFLICT1, XV-\*, FE-OYEZ, CE-StatusReport |
| **TOTAL**                | **~53**        |                                              |
