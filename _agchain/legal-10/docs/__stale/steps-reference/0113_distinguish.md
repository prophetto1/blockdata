# Distinguish

Scoring: 0.5 * agree_match + 0.5 * treatment_match
GT Source: edge.agree + normalize_shepards_to_treatment(edge.shepards)
Response Contract: V2_TREATMENT_ENUM (8 values) + boolean agree
Why keep: Treatment normalization is robust, Shepard's GT is deterministic