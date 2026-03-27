"""
Stage 3.9: Label Citations as DETAILED or PASSING.

Implements the 3-Factor Hybrid approach from citation-depth-labeling-spec.md:
- Factor 1: Syllabus Check (Gold Standard) - cited case in anchor's syllabus
- Factor 2: String Cite Detection (Structural) - semicolons, signal words
- Factor 3: TF-IDF Cosine (Statistical Fallback) - vocabulary overlap

Source files:
- citation_inventory.parquet (offsets)
- casesumm_syllabi.parquet (syllabi)
- scdb_full_with_text.jsonl (anchor text)
- scotus_citations_ranked.jsonl (cited case names)

Output: datasets/citation_depth_labels.parquet
"""

import json
import re
from pathlib import Path
from collections import defaultdict

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

PROJECT_ROOT = Path(__file__).parent.parent.parent
DATASETS = PROJECT_ROOT / "datasets"

# Input files
CITATION_INV_PATH = DATASETS / "citation_inventory.parquet"
SYLLABI_PATH = DATASETS / "casesumm_syllabi.parquet"
ANCHOR_TEXT_PATH = DATASETS / "scdb_full_with_text.jsonl"
RANKED_CITATIONS_PATH = DATASETS / "scotus_citations_ranked.jsonl"

# Output file
OUTPUT_PATH = DATASETS / "citation_depth_labels.parquet"

# Parameters
STRING_CITE_WINDOW = 50  # chars before citation to check
TFIDF_WINDOW_AFTER = 200  # chars after citation for TF-IDF
TFIDF_THRESHOLD = 0.15  # similarity threshold for DETAILED


def load_syllabi():
    """Load syllabi keyed by usCite."""
    print("Loading syllabi...")
    con = duckdb.connect()
    df = con.execute(f"""
        SELECT usCite, syllabus
        FROM read_parquet('{SYLLABI_PATH}')
        WHERE syllabus IS NOT NULL AND syllabus != ''
    """).fetchdf()
    con.close()

    syllabi = {row['usCite']: row['syllabus'] for _, row in df.iterrows()}
    print(f"  Loaded {len(syllabi):,} syllabi")
    return syllabi


def load_anchor_texts():
    """Load anchor opinion texts keyed by usCite."""
    print("Loading anchor texts...")
    texts = {}
    with open(ANCHOR_TEXT_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            case = json.loads(line)
            us_cite = case.get('usCite')
            text = case.get('majority_opinion') or case.get('text', '')
            if us_cite and text:
                texts[us_cite] = text
    print(f"  Loaded {len(texts):,} anchor texts")
    return texts


def load_citation_inventory():
    """Load citation inventory with offsets."""
    print("Loading citation inventory...")
    con = duckdb.connect()
    df = con.execute(f"""
        SELECT
            anchor_caseId,
            anchor_usCite,
            normalized_cite,
            start as cite_offset
        FROM read_parquet('{CITATION_INV_PATH}')
        WHERE cite_type = 'U.S.'
        ORDER BY anchor_caseId, cite_offset
    """).fetchdf()
    con.close()
    print(f"  Loaded {len(df):,} citation occurrences")
    return df


def load_cited_case_names():
    """Load cited case names from ranked citations."""
    print("Loading cited case names...")
    case_names = {}  # (anchor_caseId, normalized_cite) -> cited_caseName

    with open(RANKED_CITATIONS_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            record = json.loads(line)
            anchor_id = record['anchor_caseId']
            for cite in record['citations']:
                if cite.get('cited_caseName'):
                    key = (anchor_id, cite['normalized_cite'])
                    case_names[key] = cite['cited_caseName']

    print(f"  Loaded {len(case_names):,} case name mappings")
    return case_names


def check_syllabus(cited_case_name: str, anchor_syllabus: str) -> bool:
    """Factor 1: Check if cited case name appears in anchor's syllabus.

    Uses simple case-insensitive substring match per spec.
    The spec notes fuzzy matching as an open question, but for now
    we use direct substring match which is conservative and precise.
    """
    if not cited_case_name or not anchor_syllabus:
        return False

    # Simple case-insensitive substring match per spec
    return cited_case_name.upper() in anchor_syllabus.upper()


def check_string_cite(anchor_text: str, cite_offset: int) -> bool:
    """Factor 2: Check for string cite patterns before the citation.

    Detects legal string cite conventions that indicate passing mentions.
    Uses word boundaries to avoid false matches (e.g., "Seeing" != "See").
    """
    if not anchor_text or cite_offset <= 0:
        return False

    window_start = max(0, cite_offset - STRING_CITE_WINDOW)
    window_before = anchor_text[window_start:cite_offset]

    # String cite indicators with word boundaries where appropriate
    # Note: For abbreviations like "e.g." and "Cf.", we match the literal
    # string since word boundaries don't work well with trailing periods
    pattern = r'(;|\bSee\b( also| generally)?|\bCf\.|\be\.g\.|\baccord\b|\bCompare\b|\bBut see\b|\binter alia\b)'
    return bool(re.search(pattern, window_before, re.IGNORECASE))


def compute_tfidf_similarity(anchor_window: str, cited_syllabus: str) -> float:
    """Factor 3: Compute TF-IDF cosine similarity."""
    if not anchor_window or not cited_syllabus:
        return 0.0

    # Minimum text length check
    if len(anchor_window.strip()) < 20 or len(cited_syllabus.strip()) < 20:
        return 0.0

    try:
        vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=500,
            ngram_range=(1, 2)
        )
        tfidf_matrix = vectorizer.fit_transform([anchor_window, cited_syllabus])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return float(similarity)
    except Exception:
        return 0.0


def label_citation(
    anchor_usCite: str,
    cited_case_name: str,
    anchor_text: str,
    cite_offset: int,
    cited_syllabus: str,
    anchor_syllabus: str
) -> dict:
    """
    Label a citation as DETAILED or PASSING using 3-factor hybrid.

    Returns dict with: label, confidence, reason, factor, tfidf_score
    """

    # FACTOR 1: Syllabus Check (Gold Standard)
    if anchor_syllabus and cited_case_name:
        if check_syllabus(cited_case_name, anchor_syllabus):
            return {
                "label": "DETAILED",
                "confidence": 1.0,
                "reason": "in_anchor_syllabus",
                "factor": 1,
                "tfidf_score": None
            }

    # FACTOR 2: String Cite Detection (Structural)
    if anchor_text:
        if check_string_cite(anchor_text, cite_offset):
            return {
                "label": "PASSING",
                "confidence": 0.9,
                "reason": "string_cite_pattern",
                "factor": 2,
                "tfidf_score": None
            }

    # FACTOR 3: TF-IDF Cosine (Statistical Fallback)
    if anchor_text and cited_syllabus:
        window_start = cite_offset
        window_end = min(cite_offset + TFIDF_WINDOW_AFTER, len(anchor_text))
        anchor_window = anchor_text[window_start:window_end]

        tfidf_score = compute_tfidf_similarity(anchor_window, cited_syllabus)

        if tfidf_score > TFIDF_THRESHOLD:
            return {
                "label": "DETAILED",
                "confidence": 0.7,
                "reason": "tfidf_match",
                "factor": 3,
                "tfidf_score": round(tfidf_score, 4)
            }
        else:
            return {
                "label": "PASSING",
                "confidence": 0.6,
                "reason": "tfidf_low",
                "factor": 3,
                "tfidf_score": round(tfidf_score, 4)
            }

    # DEFAULT: Conservative PASSING
    return {
        "label": "PASSING",
        "confidence": 0.5,
        "reason": "default_conservative",
        "factor": 3,
        "tfidf_score": None
    }


def main():
    print("=" * 60)
    print("Stage 3.9: Citation Depth Labeling")
    print("=" * 60)

    # Load all data
    syllabi = load_syllabi()
    anchor_texts = load_anchor_texts()
    citation_df = load_citation_inventory()
    cited_case_names = load_cited_case_names()

    print("\nLabeling citations...")

    # Results storage
    results = []
    stats = defaultdict(int)

    total = len(citation_df)
    for idx, row in citation_df.iterrows():
        if idx % 10000 == 0:
            print(f"  Progress: {idx:,}/{total:,} ({100*idx/total:.1f}%)")

        anchor_caseId = row['anchor_caseId']
        anchor_usCite = row['anchor_usCite']
        normalized_cite = row['normalized_cite']
        cite_offset = row['cite_offset']

        # Look up related data
        anchor_text = anchor_texts.get(anchor_usCite, '')
        anchor_syllabus = syllabi.get(anchor_usCite, '')
        cited_syllabus = syllabi.get(normalized_cite, '')

        case_name_key = (anchor_caseId, normalized_cite)
        cited_case_name = cited_case_names.get(case_name_key, '')

        # Label the citation
        label_result = label_citation(
            anchor_usCite=anchor_usCite,
            cited_case_name=cited_case_name,
            anchor_text=anchor_text,
            cite_offset=cite_offset,
            cited_syllabus=cited_syllabus,
            anchor_syllabus=anchor_syllabus
        )

        # Track stats
        stats[f"{label_result['label']}_factor{label_result['factor']}"] += 1
        stats[label_result['label']] += 1

        # Store result
        results.append({
            'anchor_caseId': anchor_caseId,
            'anchor_usCite': anchor_usCite,
            'cited_usCite': normalized_cite,
            'cited_case_name': cited_case_name or None,
            'cite_offset': cite_offset,
            'label': label_result['label'],
            'confidence': label_result['confidence'],
            'reason': label_result['reason'],
            'factor': label_result['factor'],
            'tfidf_score': label_result['tfidf_score']
        })

    print(f"\nTotal labeled: {len(results):,}")

    # Print distribution
    print("\n" + "=" * 40)
    print("Label Distribution:")
    print("=" * 40)
    print(f"  DETAILED: {stats['DETAILED']:,} ({100*stats['DETAILED']/len(results):.1f}%)")
    print(f"    - Factor 1 (Syllabus): {stats['DETAILED_factor1']:,}")
    print(f"    - Factor 3 (TF-IDF):   {stats['DETAILED_factor3']:,}")
    print(f"  PASSING:  {stats['PASSING']:,} ({100*stats['PASSING']/len(results):.1f}%)")
    print(f"    - Factor 2 (String):   {stats['PASSING_factor2']:,}")
    print(f"    - Factor 3 (TF-IDF):   {stats['PASSING_factor3']:,}")

    # Write parquet
    print(f"\nWriting to {OUTPUT_PATH}...")

    schema = pa.schema([
        ('anchor_caseId', pa.string()),
        ('anchor_usCite', pa.string()),
        ('cited_usCite', pa.string()),
        ('cited_case_name', pa.string()),
        ('cite_offset', pa.int32()),
        ('label', pa.string()),
        ('confidence', pa.float32()),
        ('reason', pa.string()),
        ('factor', pa.int8()),
        ('tfidf_score', pa.float32())
    ])

    table = pa.Table.from_pydict({
        'anchor_caseId': [r['anchor_caseId'] for r in results],
        'anchor_usCite': [r['anchor_usCite'] for r in results],
        'cited_usCite': [r['cited_usCite'] for r in results],
        'cited_case_name': [r['cited_case_name'] for r in results],
        'cite_offset': [r['cite_offset'] for r in results],
        'label': [r['label'] for r in results],
        'confidence': [r['confidence'] for r in results],
        'reason': [r['reason'] for r in results],
        'factor': [r['factor'] for r in results],
        'tfidf_score': [r['tfidf_score'] for r in results]
    }, schema=schema)

    pq.write_table(table, OUTPUT_PATH)

    print(f"\nDone! Output: {OUTPUT_PATH}")
    print(f"  File size: {OUTPUT_PATH.stat().st_size / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
