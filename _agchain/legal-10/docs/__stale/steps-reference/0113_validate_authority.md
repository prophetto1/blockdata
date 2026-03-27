# Validate Authority

Scoring: Exact match on consistency_flag
GT Source: _compute_consistency_flag(curated_present, edge_label) - fully deterministic
Response Contract: 4-value enum: CONSISTENT | INCONSISTENT | CURATED_ONLY | CITATOR_ONLY
Why keep: Clean enum, deterministic GT computation function exists