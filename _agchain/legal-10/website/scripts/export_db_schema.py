"""
Export DuckDB database schema to JSON for external advisors.
Run: python scripts/export_db_schema.py
"""
import json
from pathlib import Path

# Database schema snapshot - compiled from DuckDB queries
schema = {
    "metadata": {
        "snapshot_date": "2026-01-16",
        "database_type": "DuckDB",
        "database_file": "datasets/legal10-updates.duckdb",
        "purpose": "Legal-10 Benchmark Database Schema for external advisors",
        "project": "LegalChain / Legal-10 Benchmark"
    },
    "statistics": {
        "total_base_tables": 13,
        "total_views": 7
    },
    "tables": {
        "scdb_cases": {
            "description": "Supreme Court Database - primary SCOTUS case metadata",
            "row_count": 29021,
            "columns": [
                {"name": "caseId", "type": "VARCHAR", "description": "SCDB case ID (primary key)"},
                {"name": "docketId", "type": "VARCHAR"},
                {"name": "caseIssuesId", "type": "VARCHAR"},
                {"name": "voteId", "type": "VARCHAR"},
                {"name": "dateDecision", "type": "VARCHAR"},
                {"name": "decisionType", "type": "VARCHAR"},
                {"name": "usCite", "type": "VARCHAR", "description": "U.S. Reports citation"},
                {"name": "sctCite", "type": "VARCHAR"},
                {"name": "ledCite", "type": "VARCHAR"},
                {"name": "lexisCite", "type": "VARCHAR", "description": "Join key for fowler_scores"},
                {"name": "term", "type": "VARCHAR"},
                {"name": "naturalCourt", "type": "VARCHAR"},
                {"name": "chief", "type": "VARCHAR"},
                {"name": "docket", "type": "VARCHAR"},
                {"name": "caseName", "type": "VARCHAR"},
                {"name": "dateArgument", "type": "VARCHAR"},
                {"name": "dateRearg", "type": "VARCHAR"},
                {"name": "petitioner", "type": "VARCHAR"},
                {"name": "petitionerState", "type": "VARCHAR"},
                {"name": "respondent", "type": "VARCHAR"},
                {"name": "respondentState", "type": "VARCHAR"},
                {"name": "jurisdiction", "type": "VARCHAR"},
                {"name": "adminAction", "type": "VARCHAR"},
                {"name": "adminActionState", "type": "VARCHAR"},
                {"name": "threeJudgeFdc", "type": "VARCHAR"},
                {"name": "caseOrigin", "type": "VARCHAR"},
                {"name": "caseOriginState", "type": "VARCHAR"},
                {"name": "caseSource", "type": "VARCHAR"},
                {"name": "caseSourceState", "type": "VARCHAR"},
                {"name": "lcDisagreement", "type": "VARCHAR"},
                {"name": "certReason", "type": "VARCHAR"},
                {"name": "lcDisposition", "type": "VARCHAR"},
                {"name": "lcDispositionDirection", "type": "VARCHAR", "description": "1=Conservative, 2=Liberal"},
                {"name": "declarationUncon", "type": "VARCHAR"},
                {"name": "caseDisposition", "type": "VARCHAR", "description": "2=Affirmed, 3=Reversed, etc."},
                {"name": "caseDispositionUnusual", "type": "VARCHAR"},
                {"name": "partyWinning", "type": "VARCHAR", "description": "0=Petitioner, 1=Respondent, 2=Unclear"},
                {"name": "precedentAlteration", "type": "VARCHAR", "description": "1=Altered precedent"},
                {"name": "voteUnclear", "type": "VARCHAR"},
                {"name": "issue", "type": "VARCHAR"},
                {"name": "issueArea", "type": "VARCHAR", "description": "Issue area 1-14"},
                {"name": "decisionDirection", "type": "VARCHAR", "description": "1=Conservative, 2=Liberal, 3=Unspecifiable"},
                {"name": "decisionDirectionDissent", "type": "VARCHAR"},
                {"name": "authorityDecision1", "type": "VARCHAR"},
                {"name": "authorityDecision2", "type": "VARCHAR"},
                {"name": "lawType", "type": "VARCHAR"},
                {"name": "lawSupp", "type": "VARCHAR"},
                {"name": "lawMinor", "type": "VARCHAR"},
                {"name": "majOpinWriter", "type": "VARCHAR", "description": "Justice ID for majority author"},
                {"name": "majOpinAssigner", "type": "VARCHAR"},
                {"name": "splitVote", "type": "VARCHAR"},
                {"name": "majVotes", "type": "VARCHAR"},
                {"name": "minVotes", "type": "VARCHAR"},
                {"name": "has_opinion_text", "type": "BOOLEAN"},
                {"name": "missing_text_reason", "type": "VARCHAR"}
            ],
            "primary_key": ["caseId"],
            "common_joins": [
                "fowler_scores ON lexisCite = lexis_cite",
                "oyez_scdb_map ON caseId = scdb_caseId",
                "scotus_citations_ranked ON caseId = anchor_caseId"
            ]
        },
        "fowler_scores": {
            "description": "Fowler authority scores - network centrality measure of precedential importance",
            "row_count": 27846,
            "columns": [
                {"name": "snapshot_year", "type": "INTEGER"},
                {"name": "auth_score", "type": "DOUBLE", "description": "Raw authority score"},
                {"name": "pauth_score", "type": "DOUBLE", "description": "Percentile authority (0-1, higher=more authoritative)"},
                {"name": "lexis_cite", "type": "VARCHAR", "description": "Join key to scdb_cases.lexisCite"}
            ],
            "notes": "Use pauth_score for question templates. Higher = more authoritative."
        },
        "shepards_edges": {
            "description": "Shepard's citation treatment edges - 5.7M citing/cited relationships",
            "row_count": 5711699,
            "columns": [
                {"name": "cited_lexis", "type": "VARCHAR", "description": "Lexis cite of cited case"},
                {"name": "citing_lexis", "type": "VARCHAR", "description": "Lexis cite of citing case"},
                {"name": "citing_court", "type": "VARCHAR"},
                {"name": "citing_opinion_type", "type": "VARCHAR"},
                {"name": "shepards_raw", "type": "VARCHAR", "description": "Raw Shepard's signal"},
                {"name": "shepards_raw_lc", "type": "VARCHAR"},
                {"name": "year_correct", "type": "INTEGER"},
                {"name": "citing_year", "type": "INTEGER"},
                {"name": "cited_year", "type": "INTEGER"},
                {"name": "appeals_court", "type": "INTEGER", "description": "Flag: appeals court citing"},
                {"name": "district_court", "type": "INTEGER"},
                {"name": "misc_citing_court", "type": "INTEGER"},
                {"name": "fed_specialized_ct", "type": "INTEGER"},
                {"name": "citing_body_not_ct", "type": "INTEGER"},
                {"name": "state_court", "type": "INTEGER"},
                {"name": "supreme_court", "type": "INTEGER", "description": "1=SCOTUS citing SCOTUS edge"},
                {"name": "cited_usid", "type": "VARCHAR"},
                {"name": "treatment_norm", "type": "VARCHAR", "description": "Normalized: follows, distinguishes, overrules, etc."},
                {"name": "agree", "type": "BOOLEAN", "description": "True=agrees, False=disagrees"}
            ],
            "notes": "Filter supreme_court=1 for SCOTUS-to-SCOTUS edges. treatment_norm is the key signal."
        },
        "martin_quinn_scores": {
            "description": "Martin-Quinn ideology scores by justice and term (1937-2022)",
            "row_count": 800,
            "columns": [
                {"name": "scdb_justice_id", "type": "INTEGER", "description": "SCDB justice ID"},
                {"name": "term", "type": "INTEGER", "description": "Supreme Court term year"},
                {"name": "post_mn", "type": "DOUBLE", "description": "Ideology: negative=liberal, positive=conservative"},
                {"name": "post_sd", "type": "DOUBLE", "description": "Uncertainty"},
                {"name": "justice_name", "type": "VARCHAR"}
            ],
            "notes": "Join to scdb_cases via CAST(majOpinWriter AS INTEGER) = scdb_justice_id"
        },
        "justice_lookup": {
            "description": "SCDB justice ID to name/code mapping",
            "row_count": 40,
            "columns": [
                {"name": "scdb_justice_id", "type": "INTEGER"},
                {"name": "mq_code", "type": "VARCHAR"},
                {"name": "justice_name", "type": "VARCHAR"},
                {"name": "start_term", "type": "INTEGER"},
                {"name": "end_term", "type": "INTEGER"}
            ]
        },
        "oyez_cases": {
            "description": "Oyez oral argument metadata",
            "row_count": 8393,
            "columns": [
                {"name": "oyez_id", "type": "BIGINT"},
                {"name": "term", "type": "INTEGER"},
                {"name": "docket_norm", "type": "VARCHAR"},
                {"name": "case_name", "type": "VARCHAR"},
                {"name": "first_party", "type": "VARCHAR"},
                {"name": "second_party", "type": "VARCHAR"},
                {"name": "winning_party", "type": "VARCHAR", "description": "For cross-validation with SCDB"},
                {"name": "decision_date", "type": "VARCHAR"},
                {"name": "transcript_count", "type": "INTEGER"}
            ]
        },
        "oyez_scdb_map": {
            "description": "Mapping between Oyez and SCDB cases",
            "row_count": 7824,
            "columns": [
                {"name": "oyez_id", "type": "BIGINT"},
                {"name": "scdb_caseId", "type": "VARCHAR", "description": "Join to scdb_cases.caseId"},
                {"name": "term", "type": "INTEGER"},
                {"name": "oyez_docket", "type": "VARCHAR"},
                {"name": "scdb_docket", "type": "VARCHAR"},
                {"name": "case_name", "type": "VARCHAR"},
                {"name": "transcript_count", "type": "INTEGER"},
                {"name": "match_confidence", "type": "VARCHAR", "description": "HIGH/MEDIUM/LOW"}
            ],
            "notes": "Use match_confidence='HIGH' for cross-validation questions"
        },
        "oyez_transcript_turns": {
            "description": "Oyez oral argument transcript turns (currently empty)",
            "row_count": 0,
            "columns": [
                {"name": "oyez_id", "type": "BIGINT"},
                {"name": "transcript_idx", "type": "INTEGER"},
                {"name": "section_idx", "type": "INTEGER"},
                {"name": "turn_idx", "type": "INTEGER"},
                {"name": "speaker", "type": "VARCHAR"},
                {"name": "speaker_role", "type": "VARCHAR"},
                {"name": "start_time", "type": "DOUBLE"},
                {"name": "stop_time", "type": "DOUBLE"},
                {"name": "text", "type": "VARCHAR"}
            ]
        },
        "scotus_text_stats": {
            "description": "Text statistics for SCOTUS opinions",
            "row_count": 27733,
            "columns": [
                {"name": "caseId", "type": "VARCHAR"},
                {"name": "usCite", "type": "VARCHAR"},
                {"name": "opinion_chars", "type": "BIGINT"},
                {"name": "opinion_file_bytes", "type": "BIGINT"},
                {"name": "syllabus_chars", "type": "BIGINT"},
                {"name": "has_syllabus", "type": "BOOLEAN"}
            ]
        },
        "cap_cases_meta": {
            "description": "Caselaw Access Project (CAP) case metadata - federal/state courts",
            "row_count": 855215,
            "columns": [
                {"name": "cap_source", "type": "VARCHAR"},
                {"name": "cap_id", "type": "BIGINT"},
                {"name": "decision_date_raw", "type": "VARCHAR"},
                {"name": "decision_year", "type": "INTEGER"},
                {"name": "court_slug", "type": "VARCHAR"},
                {"name": "court_name", "type": "VARCHAR"},
                {"name": "docket_number", "type": "VARCHAR"},
                {"name": "name", "type": "VARCHAR"},
                {"name": "name_abbreviation", "type": "VARCHAR"},
                {"name": "official_cite", "type": "VARCHAR"},
                {"name": "cite_key", "type": "VARCHAR", "description": "Normalized key for joins"}
            ]
        },
        "cap_text_stats": {
            "description": "Text statistics for CAP cases with PageRank",
            "row_count": 43043,
            "columns": [
                {"name": "cap_id", "type": "BIGINT"},
                {"name": "cap_source", "type": "VARCHAR"},
                {"name": "official_cite", "type": "VARCHAR"},
                {"name": "opinion_chars", "type": "BIGINT"},
                {"name": "pagerank_percentile", "type": "DOUBLE", "description": "0-1 authority ranking for CAP"},
                {"name": "head_matter_chars", "type": "BIGINT"}
            ]
        },
        "cl_crosswalk": {
            "description": "CourtListener crosswalk for citation mapping",
            "row_count": 866618,
            "columns": [
                {"name": "lexis_cite", "type": "VARCHAR"},
                {"name": "fed_cite", "type": "VARCHAR"},
                {"name": "cluster_id", "type": "VARCHAR"}
            ]
        },
        "songer_cases": {
            "description": "Songer database of circuit court cases",
            "row_count": 20355,
            "columns": [
                {"name": "casenum", "type": "VARCHAR"},
                {"name": "year", "type": "INTEGER"},
                {"name": "vol", "type": "INTEGER"},
                {"name": "beginpg", "type": "INTEGER"},
                {"name": "circuit", "type": "VARCHAR"},
                {"name": "treat", "type": "VARCHAR"},
                {"name": "citation", "type": "VARCHAR"},
                {"name": "case_name", "type": "VARCHAR"},
                {"name": "cite_key", "type": "VARCHAR"}
            ]
        }
    },
    "views": {
        "scdb_with_fowler": {
            "description": "SCDB cases joined with Fowler authority scores",
            "definition": "SELECT s.*, f.auth_score AS fowler_auth_score, f.pauth_score AS fowler_pauth_score FROM scdb_cases s LEFT JOIN fowler_scores f ON s.lexisCite = f.lexis_cite",
            "added_columns": ["has_fowler_score", "fowler_auth_score", "fowler_pauth_score", "fowler_snapshot_year"]
        },
        "scdb_with_ideology": {
            "description": "SCDB cases with author Martin-Quinn ideology scores",
            "definition": "Joins scdb_cases to martin_quinn_scores on majOpinWriter and term",
            "columns": ["caseId", "caseName", "term", "majOpinWriter", "author_name", "author_ideology", "ideology_uncertainty", "decisionDirection", "partyWinning", "issueArea"]
        },
        "scotus_citations_ranked": {
            "description": "Pre-ranked SCOTUS-to-SCOTUS citations by Fowler score",
            "source_file": "datasets/scotus_citations_ranked.jsonl",
            "columns": ["anchor_caseId", "anchor_usCite", "citations (STRUCT[])", "n_citations"],
            "notes": "Primary view for KA-SC question templates"
        },
        "scotus_citations_ranked_flat": {
            "description": "Flattened version for easier querying",
            "columns": ["anchor_caseId", "anchor_usCite", "rank", "normalized_cite", "cited_caseId", "cited_usCite", "cited_caseName", "fowler_score", "occurrences", "resolved"]
        },
        "cap_citations_ranked": {
            "description": "Pre-ranked CAP citations by PageRank percentile",
            "source_file": "datasets/cap_citations_ranked.jsonl",
            "notes": "For KA-CAP question templates"
        },
        "cap_citations_ranked_flat": {
            "description": "Flattened version of CAP citations",
            "columns": ["anchor_caseId", "anchor_usCite", "rank", "cite_type", "normalized_cite", "cap_id", "cap_name", "pagerank_percentile", "occurrences", "resolved"]
        },
        "songer_cap_matches": {
            "description": "Songer cases matched to CAP cases",
            "definition": "JOIN songer_cases to cap_cases_meta ON cite_key"
        }
    },
    "join_relationships": [
        {
            "name": "scdb_to_fowler",
            "from": "scdb_cases",
            "to": "fowler_scores",
            "on": "scdb_cases.lexisCite = fowler_scores.lexis_cite",
            "coverage": "~96% of SCDB cases have Fowler scores"
        },
        {
            "name": "scdb_to_citations",
            "from": "scdb_cases",
            "to": "scotus_citations_ranked_flat",
            "on": "scdb_cases.caseId = scotus_citations_ranked_flat.anchor_caseId",
            "coverage": "~70% have >=3 SCOTUS citations"
        },
        {
            "name": "citations_to_shepards",
            "from": "scotus_citations_ranked_flat",
            "to": "shepards_edges",
            "on": "Requires lexisCite lookup for both anchor and cited",
            "notes": "Get treatment_norm for citation edges"
        },
        {
            "name": "scdb_to_oyez",
            "from": "scdb_cases",
            "to": "oyez_scdb_map",
            "on": "scdb_cases.caseId = oyez_scdb_map.scdb_caseId",
            "coverage": "~27% with Oyez mapping"
        },
        {
            "name": "scdb_to_ideology",
            "from": "scdb_cases",
            "to": "martin_quinn_scores",
            "on": "CAST(majOpinWriter AS INTEGER) = scdb_justice_id AND CAST(term AS INTEGER) = term"
        }
    ],
    "coverage_statistics": {
        "anchors_with_opinion_text": {"count": 27733, "percent": 95.6},
        "anchors_with_3plus_scotus_citations": {"count": 20402, "percent": 70.3},
        "shepards_edges_total": {"count": 5711699},
        "scotus_citing_edges": {"notes": "~3M+ where supreme_court=1"},
        "anchors_with_mixed_polarity": {"count": 2499, "percent": 8.6, "notes": "Both in_favor AND against"},
        "fowler_scores_available": {"count": 27846, "percent": 96.0},
        "oyez_mapping_high_confidence": {"count": 7824, "percent": 27.0},
        "martin_quinn_pairs": {"count": 800, "notes": "1937-2022"},
        "precedent_alteration_cases": {"count": 273, "percent": 0.9}
    },
    "polarity_mapping": {
        "in_favor": ["follows", "applied", "adopted", "affirmed", "approved", "relied on", "extended", "reaffirmed"],
        "against": ["distinguishes", "limited", "criticizes", "questions", "disapproved", "not followed", "overrules", "abrogated", "superseded"],
        "neutral": ["cites", "discussed", "mentioned", "noted", "explained", "clarified", "other"]
    },
    "global_tiebreak_stack": "primary_score DESC -> secondary_score DESC -> first_offset ASC -> normalized_cite ASC, NULLS LAST"
}

# Write output
output_path = Path("datasets/database_schema_snapshot_2026-01-16.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(schema, f, indent=2)

print(f"Schema saved to: {output_path}")
print(f"Total size: {output_path.stat().st_size:,} bytes")