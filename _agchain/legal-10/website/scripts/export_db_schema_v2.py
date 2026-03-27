"""
Export DuckDB database schema to JSON for external advisors (enhanced version).
Includes: structured enum values, sample data, example queries, complete view SQL.
Run: python scripts/export_db_schema_v2.py
"""
import json
from pathlib import Path
from datetime import date

schema = {
    "metadata": {
        "snapshot_date": str(date.today()),
        "schema_version": "2.0",
        "database_type": "DuckDB",
        "database_file": "datasets/legal10-updates.duckdb",
        "purpose": "Legal-10 Benchmark Database Schema for external advisors writing question templates",
        "project": "LegalChain / Legal-10 Benchmark",
        "enhancements": [
            "Structured enum_values for coded columns",
            "Sample data rows for key tables",
            "Example SQL queries for common operations",
            "Complete view SQL definitions"
        ]
    },
    "statistics": {
        "total_base_tables": 13,
        "total_views": 7
    },
    "enum_definitions": {
        "decisionDirection": {
            "description": "Ideological direction of the Supreme Court decision",
            "values": {
                "1": {"label": "Conservative", "count": 12012},
                "2": {"label": "Liberal", "count": 13081},
                "3": {"label": "Unspecifiable", "count": 3832}
            },
            "null_count": 96
        },
        "partyWinning": {
            "description": "Which party won the case",
            "values": {
                "0": {"label": "Petitioner won", "count": 15922},
                "1": {"label": "Respondent won", "count": 12359},
                "2": {"label": "Unclear/tied", "count": 722}
            },
            "null_count": 18
        },
        "caseDisposition": {
            "description": "How the Court disposed of the case",
            "values": {
                "1": {"label": "Stay, petition or motion granted", "count": 206},
                "2": {"label": "Affirmed", "count": 13248},
                "3": {"label": "Reversed", "count": 5046},
                "4": {"label": "Reversed and remanded", "count": 5327},
                "5": {"label": "Vacated and remanded", "count": 1222},
                "6": {"label": "Affirmed in part, reversed in part", "count": 154},
                "7": {"label": "Reversed in part", "count": 256},
                "8": {"label": "Vacated", "count": 51},
                "9": {"label": "Petition granted", "count": 2433},
                "10": {"label": "Certiorari denied", "count": 636},
                "11": {"label": "Dismissed", "count": 186}
            },
            "null_count": 256
        },
        "issueArea": {
            "description": "Primary issue area of the case (SCDB coding)",
            "values": {
                "1": {"label": "Criminal Procedure", "count": 3165},
                "2": {"label": "Civil Rights", "count": 2723},
                "3": {"label": "First Amendment", "count": 812},
                "4": {"label": "Due Process", "count": 1136},
                "5": {"label": "Privacy", "count": 139},
                "6": {"label": "Attorneys", "count": 334},
                "7": {"label": "Unions", "count": 533},
                "8": {"label": "Economic Activity", "count": 8401},
                "9": {"label": "Judicial Power", "count": 5553},
                "10": {"label": "Federalism", "count": 898},
                "11": {"label": "Interstate Relations", "count": 271},
                "12": {"label": "Federal Taxation", "count": 1488},
                "13": {"label": "Miscellaneous", "count": 115},
                "14": {"label": "Private Action", "count": 3334}
            }
        },
        "treatment_norm": {
            "description": "Normalized Shepard's citation treatment signal",
            "values": {
                "cites": {"label": "Neutral citation", "count": 5083512, "polarity": "neutral"},
                "follows": {"label": "Follows precedent", "count": 365889, "polarity": "in_favor"},
                "distinguishes": {"label": "Distinguishes facts/holding", "count": 143239, "polarity": "against"},
                "explains": {"label": "Explains meaning", "count": 89044, "polarity": "neutral"},
                "questions": {"label": "Questions validity", "count": 14905, "polarity": "against"},
                "other": {"label": "Other treatment", "count": 9061, "polarity": "neutral"},
                "criticizes": {"label": "Criticizes reasoning", "count": 4115, "polarity": "against"},
                "overrules": {"label": "Overrules precedent", "count": 1125, "polarity": "against"},
                "limits": {"label": "Limits application", "count": 809, "polarity": "against"}
            }
        },
        "match_confidence": {
            "description": "Confidence level for Oyez-SCDB case matching",
            "values": {
                "HIGH": {"label": "High confidence match"},
                "MEDIUM": {"label": "Medium confidence match"},
                "LOW": {"label": "Low confidence match"}
            }
        }
    },
    "tables": {
        "scdb_cases": {
            "description": "Supreme Court Database - primary SCOTUS case metadata (1946-present)",
            "row_count": 29021,
            "columns": [
                {"name": "caseId", "type": "VARCHAR", "nullable": False, "description": "SCDB case ID (primary key, format: YYYY-NNN)"},
                {"name": "docketId", "type": "VARCHAR", "nullable": True},
                {"name": "caseIssuesId", "type": "VARCHAR", "nullable": True},
                {"name": "voteId", "type": "VARCHAR", "nullable": True},
                {"name": "dateDecision", "type": "VARCHAR", "nullable": True, "description": "Decision date (MM/DD/YYYY)"},
                {"name": "decisionType", "type": "VARCHAR", "nullable": True},
                {"name": "usCite", "type": "VARCHAR", "nullable": True, "description": "U.S. Reports citation (e.g., '329 U.S. 1')"},
                {"name": "sctCite", "type": "VARCHAR", "nullable": True},
                {"name": "ledCite", "type": "VARCHAR", "nullable": True},
                {"name": "lexisCite", "type": "VARCHAR", "nullable": True, "description": "Lexis citation - join key for fowler_scores"},
                {"name": "term", "type": "VARCHAR", "nullable": False, "description": "Supreme Court term year"},
                {"name": "naturalCourt", "type": "VARCHAR", "nullable": True},
                {"name": "chief", "type": "VARCHAR", "nullable": True},
                {"name": "docket", "type": "VARCHAR", "nullable": True},
                {"name": "caseName", "type": "VARCHAR", "nullable": False, "description": "Full case name"},
                {"name": "dateArgument", "type": "VARCHAR", "nullable": True},
                {"name": "dateRearg", "type": "VARCHAR", "nullable": True},
                {"name": "petitioner", "type": "VARCHAR", "nullable": True},
                {"name": "petitionerState", "type": "VARCHAR", "nullable": True},
                {"name": "respondent", "type": "VARCHAR", "nullable": True},
                {"name": "respondentState", "type": "VARCHAR", "nullable": True},
                {"name": "jurisdiction", "type": "VARCHAR", "nullable": True},
                {"name": "adminAction", "type": "VARCHAR", "nullable": True},
                {"name": "adminActionState", "type": "VARCHAR", "nullable": True},
                {"name": "threeJudgeFdc", "type": "VARCHAR", "nullable": True},
                {"name": "caseOrigin", "type": "VARCHAR", "nullable": True},
                {"name": "caseOriginState", "type": "VARCHAR", "nullable": True},
                {"name": "caseSource", "type": "VARCHAR", "nullable": True},
                {"name": "caseSourceState", "type": "VARCHAR", "nullable": True},
                {"name": "lcDisagreement", "type": "VARCHAR", "nullable": True},
                {"name": "certReason", "type": "VARCHAR", "nullable": True},
                {"name": "lcDisposition", "type": "VARCHAR", "nullable": True},
                {"name": "lcDispositionDirection", "type": "VARCHAR", "nullable": True, "enum_ref": "decisionDirection"},
                {"name": "declarationUncon", "type": "VARCHAR", "nullable": True},
                {"name": "caseDisposition", "type": "VARCHAR", "nullable": True, "enum_ref": "caseDisposition"},
                {"name": "caseDispositionUnusual", "type": "VARCHAR", "nullable": True},
                {"name": "partyWinning", "type": "VARCHAR", "nullable": True, "enum_ref": "partyWinning"},
                {"name": "precedentAlteration", "type": "VARCHAR", "nullable": True, "description": "1=Altered/overruled precedent"},
                {"name": "voteUnclear", "type": "VARCHAR", "nullable": True},
                {"name": "issue", "type": "VARCHAR", "nullable": True},
                {"name": "issueArea", "type": "VARCHAR", "nullable": True, "enum_ref": "issueArea"},
                {"name": "decisionDirection", "type": "VARCHAR", "nullable": True, "enum_ref": "decisionDirection"},
                {"name": "decisionDirectionDissent", "type": "VARCHAR", "nullable": True},
                {"name": "authorityDecision1", "type": "VARCHAR", "nullable": True},
                {"name": "authorityDecision2", "type": "VARCHAR", "nullable": True},
                {"name": "lawType", "type": "VARCHAR", "nullable": True},
                {"name": "lawSupp", "type": "VARCHAR", "nullable": True},
                {"name": "lawMinor", "type": "VARCHAR", "nullable": True},
                {"name": "majOpinWriter", "type": "VARCHAR", "nullable": True, "description": "SCDB justice ID for majority opinion author"},
                {"name": "majOpinAssigner", "type": "VARCHAR", "nullable": True},
                {"name": "splitVote", "type": "VARCHAR", "nullable": True},
                {"name": "majVotes", "type": "VARCHAR", "nullable": True},
                {"name": "minVotes", "type": "VARCHAR", "nullable": True},
                {"name": "has_opinion_text", "type": "BOOLEAN", "nullable": False, "description": "True if opinion text is available"},
                {"name": "missing_text_reason", "type": "VARCHAR", "nullable": True}
            ],
            "primary_key": ["caseId"],
            "common_joins": [
                "fowler_scores ON lexisCite = lexis_cite",
                "oyez_scdb_map ON caseId = scdb_caseId",
                "scotus_citations_ranked_flat ON caseId = anchor_caseId"
            ]
        },
        "fowler_scores": {
            "description": "Fowler authority scores - network centrality measure of precedential importance",
            "row_count": 27846,
            "columns": [
                {"name": "snapshot_year", "type": "INTEGER", "nullable": True},
                {"name": "auth_score", "type": "DOUBLE", "nullable": True, "description": "Raw authority score"},
                {"name": "pauth_score", "type": "DOUBLE", "nullable": False, "description": "Percentile authority (0-1, higher=more authoritative)"},
                {"name": "lexis_cite", "type": "VARCHAR", "nullable": False, "description": "Join key to scdb_cases.lexisCite"}
            ],
            "notes": "Use pauth_score for ranking citations. 0.9+ = highly authoritative, 0.5 = median."
        },
        "shepards_edges": {
            "description": "Shepard's citation treatment edges - 5.7M citing/cited relationships",
            "row_count": 5711699,
            "columns": [
                {"name": "cited_lexis", "type": "VARCHAR", "nullable": False, "description": "Lexis cite of the CITED case"},
                {"name": "citing_lexis", "type": "VARCHAR", "nullable": False, "description": "Lexis cite of the CITING case"},
                {"name": "citing_court", "type": "VARCHAR", "nullable": True},
                {"name": "citing_opinion_type", "type": "VARCHAR", "nullable": True},
                {"name": "shepards_raw", "type": "VARCHAR", "nullable": True, "description": "Raw Shepard's signal"},
                {"name": "shepards_raw_lc", "type": "VARCHAR", "nullable": True},
                {"name": "year_correct", "type": "INTEGER", "nullable": True},
                {"name": "citing_year", "type": "INTEGER", "nullable": True},
                {"name": "cited_year", "type": "INTEGER", "nullable": True},
                {"name": "appeals_court", "type": "INTEGER", "nullable": True, "description": "1 if citing court is appeals court"},
                {"name": "district_court", "type": "INTEGER", "nullable": True},
                {"name": "misc_citing_court", "type": "INTEGER", "nullable": True},
                {"name": "fed_specialized_ct", "type": "INTEGER", "nullable": True},
                {"name": "citing_body_not_ct", "type": "INTEGER", "nullable": True},
                {"name": "state_court", "type": "INTEGER", "nullable": True},
                {"name": "supreme_court", "type": "INTEGER", "nullable": True, "description": "1 = SCOTUS citing SCOTUS (key filter)"},
                {"name": "cited_usid", "type": "VARCHAR", "nullable": True},
                {"name": "treatment_norm", "type": "VARCHAR", "nullable": True, "enum_ref": "treatment_norm"},
                {"name": "agree", "type": "BOOLEAN", "nullable": True, "description": "True=positive treatment, False=negative"}
            ],
            "notes": "Filter supreme_court=1 for SCOTUS-to-SCOTUS edges. treatment_norm is the key signal for polarity."
        },
        "martin_quinn_scores": {
            "description": "Martin-Quinn ideology scores by justice and term (1937-2022)",
            "row_count": 800,
            "columns": [
                {"name": "scdb_justice_id", "type": "INTEGER", "nullable": False, "description": "SCDB justice ID"},
                {"name": "term", "type": "INTEGER", "nullable": False, "description": "Supreme Court term year"},
                {"name": "post_mn", "type": "DOUBLE", "nullable": False, "description": "Ideology score: negative=liberal, positive=conservative"},
                {"name": "post_sd", "type": "DOUBLE", "nullable": True, "description": "Standard deviation (uncertainty)"},
                {"name": "justice_name", "type": "VARCHAR", "nullable": False}
            ],
            "notes": "Join to scdb_cases: CAST(majOpinWriter AS INTEGER) = scdb_justice_id AND CAST(term AS INTEGER) = term"
        },
        "justice_lookup": {
            "description": "SCDB justice ID to name/code mapping",
            "row_count": 40,
            "columns": [
                {"name": "scdb_justice_id", "type": "INTEGER", "nullable": False},
                {"name": "mq_code", "type": "VARCHAR", "nullable": True},
                {"name": "justice_name", "type": "VARCHAR", "nullable": False},
                {"name": "start_term", "type": "INTEGER", "nullable": True},
                {"name": "end_term", "type": "INTEGER", "nullable": True}
            ]
        },
        "oyez_cases": {
            "description": "Oyez oral argument metadata",
            "row_count": 8393,
            "columns": [
                {"name": "oyez_id", "type": "BIGINT", "nullable": False},
                {"name": "term", "type": "INTEGER", "nullable": True},
                {"name": "docket_norm", "type": "VARCHAR", "nullable": True},
                {"name": "case_name", "type": "VARCHAR", "nullable": True},
                {"name": "first_party", "type": "VARCHAR", "nullable": True},
                {"name": "second_party", "type": "VARCHAR", "nullable": True},
                {"name": "winning_party", "type": "VARCHAR", "nullable": True, "description": "For cross-validation with SCDB partyWinning"},
                {"name": "decision_date", "type": "VARCHAR", "nullable": True},
                {"name": "transcript_count", "type": "INTEGER", "nullable": True}
            ]
        },
        "oyez_scdb_map": {
            "description": "Mapping between Oyez and SCDB cases",
            "row_count": 7824,
            "columns": [
                {"name": "oyez_id", "type": "BIGINT", "nullable": False},
                {"name": "scdb_caseId", "type": "VARCHAR", "nullable": False, "description": "Join to scdb_cases.caseId"},
                {"name": "term", "type": "INTEGER", "nullable": True},
                {"name": "oyez_docket", "type": "VARCHAR", "nullable": True},
                {"name": "scdb_docket", "type": "VARCHAR", "nullable": True},
                {"name": "case_name", "type": "VARCHAR", "nullable": True},
                {"name": "transcript_count", "type": "INTEGER", "nullable": True},
                {"name": "match_confidence", "type": "VARCHAR", "nullable": True, "enum_ref": "match_confidence"}
            ],
            "notes": "Use match_confidence='HIGH' for cross-validation questions"
        },
        "oyez_transcript_turns": {
            "description": "Oyez oral argument transcript turns (currently empty - pending data load)",
            "row_count": 0,
            "columns": [
                {"name": "oyez_id", "type": "BIGINT", "nullable": False},
                {"name": "transcript_idx", "type": "INTEGER", "nullable": False},
                {"name": "section_idx", "type": "INTEGER", "nullable": False},
                {"name": "turn_idx", "type": "INTEGER", "nullable": False},
                {"name": "speaker", "type": "VARCHAR", "nullable": True},
                {"name": "speaker_role", "type": "VARCHAR", "nullable": True},
                {"name": "start_time", "type": "DOUBLE", "nullable": True},
                {"name": "stop_time", "type": "DOUBLE", "nullable": True},
                {"name": "text", "type": "VARCHAR", "nullable": True}
            ]
        },
        "scotus_text_stats": {
            "description": "Text statistics for SCOTUS opinions",
            "row_count": 27733,
            "columns": [
                {"name": "caseId", "type": "VARCHAR", "nullable": False},
                {"name": "usCite", "type": "VARCHAR", "nullable": True},
                {"name": "opinion_chars", "type": "BIGINT", "nullable": True},
                {"name": "opinion_file_bytes", "type": "BIGINT", "nullable": True},
                {"name": "syllabus_chars", "type": "BIGINT", "nullable": True},
                {"name": "has_syllabus", "type": "BOOLEAN", "nullable": True}
            ]
        },
        "cap_cases_meta": {
            "description": "Caselaw Access Project (CAP) case metadata - federal/state appellate courts",
            "row_count": 855215,
            "columns": [
                {"name": "cap_source", "type": "VARCHAR", "nullable": True},
                {"name": "cap_id", "type": "BIGINT", "nullable": False},
                {"name": "decision_date_raw", "type": "VARCHAR", "nullable": True},
                {"name": "decision_year", "type": "INTEGER", "nullable": True},
                {"name": "court_slug", "type": "VARCHAR", "nullable": True},
                {"name": "court_name", "type": "VARCHAR", "nullable": True},
                {"name": "docket_number", "type": "VARCHAR", "nullable": True},
                {"name": "name", "type": "VARCHAR", "nullable": True},
                {"name": "name_abbreviation", "type": "VARCHAR", "nullable": True},
                {"name": "official_cite", "type": "VARCHAR", "nullable": True},
                {"name": "cite_key", "type": "VARCHAR", "nullable": True, "description": "Normalized citation key for joins"}
            ]
        },
        "cap_text_stats": {
            "description": "Text statistics for CAP cases with PageRank authority scores",
            "row_count": 43043,
            "columns": [
                {"name": "cap_id", "type": "BIGINT", "nullable": False},
                {"name": "cap_source", "type": "VARCHAR", "nullable": True},
                {"name": "official_cite", "type": "VARCHAR", "nullable": True},
                {"name": "opinion_chars", "type": "BIGINT", "nullable": True},
                {"name": "pagerank_percentile", "type": "DOUBLE", "nullable": True, "description": "0-1 authority ranking (like Fowler for non-SCOTUS)"},
                {"name": "head_matter_chars", "type": "BIGINT", "nullable": True}
            ]
        },
        "cl_crosswalk": {
            "description": "CourtListener crosswalk for citation mapping across sources",
            "row_count": 866618,
            "columns": [
                {"name": "lexis_cite", "type": "VARCHAR", "nullable": True},
                {"name": "fed_cite", "type": "VARCHAR", "nullable": True},
                {"name": "cluster_id", "type": "VARCHAR", "nullable": True}
            ]
        },
        "songer_cases": {
            "description": "Songer database of circuit court cases",
            "row_count": 20355,
            "columns": [
                {"name": "casenum", "type": "VARCHAR", "nullable": False},
                {"name": "year", "type": "INTEGER", "nullable": True},
                {"name": "vol", "type": "INTEGER", "nullable": True},
                {"name": "beginpg", "type": "INTEGER", "nullable": True},
                {"name": "circuit", "type": "VARCHAR", "nullable": True},
                {"name": "treat", "type": "VARCHAR", "nullable": True},
                {"name": "citation", "type": "VARCHAR", "nullable": True},
                {"name": "case_name", "type": "VARCHAR", "nullable": True},
                {"name": "cite_key", "type": "VARCHAR", "nullable": True}
            ]
        }
    },
    "views": {
        "scdb_with_fowler": {
            "description": "SCDB cases joined with Fowler authority scores",
            "sql": "CREATE VIEW scdb_with_fowler AS SELECT s.*, ((f.auth_score IS NOT NULL) OR (f.pauth_score IS NOT NULL)) AS has_fowler_score, f.auth_score AS fowler_auth_score, f.pauth_score AS fowler_pauth_score, f.snapshot_year AS fowler_snapshot_year FROM scdb_cases AS s LEFT JOIN fowler_scores AS f ON ((s.lexisCite = f.lexis_cite));",
            "output_columns": ["(all scdb_cases columns)", "has_fowler_score", "fowler_auth_score", "fowler_pauth_score", "fowler_snapshot_year"]
        },
        "scdb_with_ideology": {
            "description": "SCDB cases with majority opinion author's Martin-Quinn ideology score",
            "sql": "CREATE VIEW scdb_with_ideology AS SELECT s.caseId, s.caseName, s.term, s.majOpinWriter, m.justice_name AS author_name, m.post_mn AS author_ideology, m.post_sd AS ideology_uncertainty, s.decisionDirection, s.partyWinning, s.issueArea FROM scdb_cases AS s LEFT JOIN martin_quinn_scores AS m ON (((CAST(s.majOpinWriter AS INTEGER) = m.scdb_justice_id) AND (CAST(s.term AS INTEGER) = m.term))) WHERE (s.majOpinWriter IS NOT NULL);",
            "output_columns": ["caseId", "caseName", "term", "majOpinWriter", "author_name", "author_ideology", "ideology_uncertainty", "decisionDirection", "partyWinning", "issueArea"]
        },
        "scotus_citations_ranked": {
            "description": "Pre-ranked SCOTUS-to-SCOTUS citations by Fowler score (nested structure)",
            "sql": "CREATE VIEW scotus_citations_ranked AS SELECT * FROM read_json_auto('datasets/scotus_citations_ranked.jsonl');",
            "source_file": "datasets/scotus_citations_ranked.jsonl",
            "output_columns": ["anchor_caseId", "anchor_usCite", "citations (STRUCT[])", "n_citations"],
            "notes": "Primary view for KA-SC question templates. Citations array is pre-sorted by fowler_score DESC."
        },
        "scotus_citations_ranked_flat": {
            "description": "Flattened SCOTUS citations - one row per anchor-cited pair",
            "sql": "CREATE VIEW scotus_citations_ranked_flat AS SELECT r.anchor_caseId, r.anchor_usCite, c.rank AS rank, c.normalized_cite, c.cited_caseId, c.cited_usCite, c.cited_caseName, c.fowler_score, c.occurrences, c.resolved FROM scotus_citations_ranked AS r, unnest(r.citations) AS t(c);",
            "output_columns": ["anchor_caseId", "anchor_usCite", "rank", "normalized_cite", "cited_caseId", "cited_usCite", "cited_caseName", "fowler_score", "occurrences", "resolved"]
        },
        "cap_citations_ranked": {
            "description": "Pre-ranked CAP (appellate) citations by PageRank percentile (nested structure)",
            "sql": "CREATE VIEW cap_citations_ranked AS SELECT * FROM read_json_auto('datasets/cap_citations_ranked.jsonl');",
            "source_file": "datasets/cap_citations_ranked.jsonl",
            "notes": "For KA-CAP question templates targeting non-SCOTUS federal courts."
        },
        "cap_citations_ranked_flat": {
            "description": "Flattened CAP citations - one row per anchor-cited pair",
            "sql": "CREATE VIEW cap_citations_ranked_flat AS SELECT r.anchor_caseId, r.anchor_usCite, c.rank AS rank, c.cite_type, c.normalized_cite, c.cap_id, c.cap_name, c.pagerank_percentile, c.occurrences, c.resolved FROM cap_citations_ranked AS r, unnest(r.citations) AS t(c);",
            "output_columns": ["anchor_caseId", "anchor_usCite", "rank", "cite_type", "normalized_cite", "cap_id", "cap_name", "pagerank_percentile", "occurrences", "resolved"]
        },
        "songer_cap_matches": {
            "description": "Songer circuit court cases matched to CAP metadata",
            "sql": "CREATE VIEW songer_cap_matches AS SELECT s.*, c.cap_source, c.cap_id AS cap_id, c.decision_year AS cap_decision_year, c.court_slug AS cap_court_slug FROM songer_cases AS s INNER JOIN cap_cases_meta AS c ON (((s.cite_key IS NOT NULL) AND (s.cite_key = c.cite_key)));",
            "output_columns": ["(all songer_cases columns)", "cap_source", "cap_id", "cap_decision_year", "cap_court_slug"]
        }
    },
    "sample_data": {
        "scdb_cases": [
            {"caseId": "1946-001", "caseName": "HALLIBURTON OIL WELL CEMENTING CO. v. WALKER et al.", "term": "1946", "usCite": "329 U.S. 1", "decisionDirection": "2", "partyWinning": "1", "issueArea": "8"},
            {"caseId": "1946-002", "caseName": "CLEVELAND v. UNITED STATES", "term": "1946", "usCite": "329 U.S. 14", "decisionDirection": "1", "partyWinning": "0", "issueArea": "1"},
            {"caseId": "1946-003", "caseName": "CHAMPLIN REFINING CO. v. UNITED STATES ET AL.", "term": "1946", "usCite": "329 U.S. 29", "decisionDirection": "2", "partyWinning": "0", "issueArea": "8"}
        ],
        "scotus_citations_ranked_flat": [
            {"anchor_caseId": "1946-001", "anchor_usCite": "329 U.S. 1", "rank": 1, "normalized_cite": "319 U.S. 315", "cited_caseId": "1942-038", "fowler_score": 0.964191},
            {"anchor_caseId": "1946-001", "anchor_usCite": "329 U.S. 1", "rank": 2, "normalized_cite": "310 U.S. 573", "cited_caseId": "1939-066", "fowler_score": 0.807061},
            {"anchor_caseId": "1946-001", "anchor_usCite": "329 U.S. 1", "rank": 3, "normalized_cite": "210 U.S. 405", "cited_caseId": "1907-133", "fowler_score": 0.78903}
        ],
        "shepards_edges": [
            {"cited_lexis": "1796 U.S. LEXIS 409", "citing_lexis": "1792 U.S. LEXIS 587", "treatment_norm": "cites", "agree": False, "supreme_court": 1},
            {"cited_lexis": "1793 U.S. LEXIS 249", "citing_lexis": "1793 U.S. LEXIS 247", "treatment_norm": "cites", "agree": False, "supreme_court": 1}
        ]
    },
    "example_queries": {
        "get_top_5_citations_for_case": {
            "description": "Get the top 5 most authoritative citations for a specific anchor case",
            "sql": "SELECT anchor_caseId, anchor_usCite, rank, normalized_cite, cited_caseName, fowler_score FROM scotus_citations_ranked_flat WHERE anchor_caseId = '1946-001' ORDER BY rank LIMIT 5;"
        },
        "find_cases_with_mixed_treatment": {
            "description": "Find anchor cases that both follow AND distinguish the same cited case",
            "sql": "SELECT s1.citing_lexis as anchor, s1.cited_lexis as cited, s1.treatment_norm as treat1, s2.treatment_norm as treat2 FROM shepards_edges s1 JOIN shepards_edges s2 ON s1.citing_lexis = s2.citing_lexis AND s1.cited_lexis = s2.cited_lexis WHERE s1.supreme_court = 1 AND s2.supreme_court = 1 AND s1.treatment_norm = 'follows' AND s2.treatment_norm = 'distinguishes' LIMIT 10;"
        },
        "get_liberal_decisions_by_conservative_author": {
            "description": "Find liberal decisions written by conservative justices (ideology mismatch)",
            "sql": "SELECT caseId, caseName, author_name, author_ideology, decisionDirection FROM scdb_with_ideology WHERE author_ideology > 1.0 AND decisionDirection = '2' ORDER BY author_ideology DESC LIMIT 20;"
        },
        "count_citations_by_treatment": {
            "description": "Count SCOTUS-to-SCOTUS citation edges by treatment type",
            "sql": "SELECT treatment_norm, COUNT(*) as cnt FROM shepards_edges WHERE supreme_court = 1 GROUP BY treatment_norm ORDER BY cnt DESC;"
        },
        "get_highly_authoritative_cases": {
            "description": "Find the most authoritative SCOTUS cases by Fowler percentile",
            "sql": "SELECT s.caseId, s.caseName, s.usCite, s.term, f.pauth_score FROM scdb_cases s JOIN fowler_scores f ON s.lexisCite = f.lexis_cite WHERE f.pauth_score > 0.95 ORDER BY f.pauth_score DESC LIMIT 20;"
        },
        "cases_with_oyez_transcripts": {
            "description": "Find SCDB cases that have high-confidence Oyez oral argument mappings",
            "sql": "SELECT s.caseId, s.caseName, s.term, o.oyez_id, o.transcript_count FROM scdb_cases s JOIN oyez_scdb_map o ON s.caseId = o.scdb_caseId WHERE o.match_confidence = 'HIGH' AND o.transcript_count > 0 ORDER BY s.term DESC LIMIT 20;"
        }
    },
    "join_relationships": [
        {
            "name": "scdb_to_fowler",
            "from_table": "scdb_cases",
            "to_table": "fowler_scores",
            "join_condition": "scdb_cases.lexisCite = fowler_scores.lexis_cite",
            "join_type": "LEFT JOIN",
            "coverage_percent": 96.0,
            "coverage_note": "~96% of SCDB cases have Fowler scores"
        },
        {
            "name": "scdb_to_citations",
            "from_table": "scdb_cases",
            "to_table": "scotus_citations_ranked_flat",
            "join_condition": "scdb_cases.caseId = scotus_citations_ranked_flat.anchor_caseId",
            "join_type": "LEFT JOIN",
            "coverage_percent": 70.3,
            "coverage_note": "~70% of cases have >=3 ranked SCOTUS citations"
        },
        {
            "name": "citations_to_shepards",
            "from_table": "scotus_citations_ranked_flat",
            "to_table": "shepards_edges",
            "join_condition": "Requires lexisCite lookup via scdb_cases for both anchor and cited case",
            "join_type": "Complex (multi-hop)",
            "notes": "Use this to get treatment_norm for citation edges"
        },
        {
            "name": "scdb_to_oyez",
            "from_table": "scdb_cases",
            "to_table": "oyez_scdb_map",
            "join_condition": "scdb_cases.caseId = oyez_scdb_map.scdb_caseId",
            "join_type": "LEFT JOIN",
            "coverage_percent": 27.0,
            "coverage_note": "~27% of SCDB cases have Oyez mapping (mostly post-1955)"
        },
        {
            "name": "scdb_to_ideology",
            "from_table": "scdb_cases",
            "to_table": "martin_quinn_scores",
            "join_condition": "CAST(scdb_cases.majOpinWriter AS INTEGER) = martin_quinn_scores.scdb_justice_id AND CAST(scdb_cases.term AS INTEGER) = martin_quinn_scores.term",
            "join_type": "LEFT JOIN",
            "notes": "Requires type casting since SCDB stores as VARCHAR"
        }
    ],
    "coverage_statistics": {
        "anchors_with_opinion_text": {"count": 27733, "percent": 95.6},
        "anchors_with_3plus_scotus_citations": {"count": 20402, "percent": 70.3},
        "shepards_edges_total": {"count": 5711699},
        "scotus_citing_scotus_edges": {"notes": "Filter with supreme_court=1"},
        "anchors_with_mixed_polarity": {"count": 2499, "percent": 8.6, "notes": "Have both in_favor AND against treatments"},
        "fowler_scores_available": {"count": 27846, "percent": 96.0},
        "oyez_mapping_high_confidence": {"count": 7824, "percent": 27.0},
        "martin_quinn_pairs": {"count": 800, "notes": "Justice-term pairs from 1937-2022"},
        "precedent_alteration_cases": {"count": 273, "percent": 0.9, "notes": "Cases where precedentAlteration=1"}
    },
    "polarity_mapping": {
        "description": "Maps treatment_norm values to polarity categories for question templates",
        "in_favor": ["follows", "applied", "adopted", "affirmed", "approved", "relied on", "extended", "reaffirmed"],
        "against": ["distinguishes", "limited", "criticizes", "questions", "disapproved", "not followed", "overrules", "abrogated", "superseded", "limits"],
        "neutral": ["cites", "discussed", "mentioned", "noted", "explained", "clarified", "other"]
    },
    "global_tiebreak_stack": {
        "description": "Deterministic ordering for citation ranking when scores are equal",
        "order": "primary_score DESC -> secondary_score DESC -> first_offset ASC -> normalized_cite ASC",
        "null_handling": "NULLS LAST"
    }
}

# Write output
output_path = Path("datasets/database_schema_snapshot_v2.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(schema, f, indent=2)

print(f"Enhanced schema saved to: {output_path}")
print(f"Total size: {output_path.stat().st_size:,} bytes")
print(f"\nEnhancements included:")
print("  - Structured enum_definitions with value counts")
print("  - enum_ref links on columns")
print("  - nullable flags on all columns")
print("  - sample_data for 3 key tables")
print("  - example_queries with 6 common operations")
print("  - Complete view SQL definitions")
