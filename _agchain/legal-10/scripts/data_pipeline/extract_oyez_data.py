#!/usr/bin/env python3
"""
Extract Oyez oral argument transcripts and justice profiles.
Outputs:
  - oyez_transcript_turns.jsonl: All speaker turns with case metadata
  - oyez_justice_profiles.jsonl: Unique justice profiles with roles
"""

import json
from pathlib import Path
from datetime import datetime

# Paths
OYEZ_DIR = Path("datasets/references/data_2_oyez_repo/oyez/cases")
OUTPUT_DIR = Path("datasets/extracted")
OUTPUT_DIR.mkdir(exist_ok=True)

# Track unique justices
justice_profiles = {}

def extract_us_cite(citation: dict) -> str | None:
    """Build U.S. Reports citation from volume/page."""
    if citation and citation.get("volume") and citation.get("page"):
        return f"{citation['volume']} U.S. {citation['page']}"
    return None

def unix_to_date(timestamp: int) -> str | None:
    """Convert unix timestamp to ISO date."""
    if timestamp:
        try:
            return datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
        except (ValueError, OSError):
            return None
    return None

def extract_case_metadata(case_file: Path) -> dict | None:
    """Extract case metadata from non-transcript file."""
    try:
        with open(case_file, 'r', encoding='utf-8') as f:
            case = json.load(f)

        # Get citation
        citation = case.get("citation", {})
        us_cite = extract_us_cite(citation)

        # Get dates from timeline
        decided_date = None
        argued_date = None
        for event in case.get("timeline", []):
            dates = event.get("dates", [])
            if dates:
                if event.get("event") == "Decided":
                    decided_date = unix_to_date(dates[0])
                elif event.get("event") == "Argued":
                    argued_date = unix_to_date(dates[0])

        # Get winning party
        decisions = case.get("decisions", [])
        winning_party = None
        majority_vote = None
        minority_vote = None
        if decisions:
            winning_party = decisions[0].get("winning_party")
            majority_vote = decisions[0].get("majority_vote")
            minority_vote = decisions[0].get("minority_vote")

        return {
            "oyez_id": case.get("ID"),
            "name": case.get("name"),
            "docket_number": case.get("docket_number"),
            "term": case.get("term"),
            "us_cite": us_cite,
            "citation_volume": citation.get("volume"),
            "citation_page": citation.get("page"),
            "citation_year": citation.get("year"),
            "first_party": case.get("first_party"),
            "second_party": case.get("second_party"),
            "first_party_label": case.get("first_party_label"),
            "second_party_label": case.get("second_party_label"),
            "winning_party": winning_party,
            "majority_vote": majority_vote,
            "minority_vote": minority_vote,
            "decided_date": decided_date,
            "argued_date": argued_date,
            "question": case.get("question"),
            "facts_of_the_case": case.get("facts_of_the_case"),
            "conclusion": case.get("conclusion"),
            "description": case.get("description"),
        }
    except Exception as e:
        print(f"Error reading case file {case_file}: {e}")
        return None

def extract_transcript(transcript_file: Path, case_metadata: dict) -> list[dict]:
    """Extract all turns from a transcript file."""
    turns = []
    try:
        with open(transcript_file, 'r', encoding='utf-8') as f:
            transcript = json.load(f)

        transcript_id = transcript.get("id")
        transcript_title = transcript.get("title")  # e.g., "Oral Argument - April 28, 2021"

        transcript_data = transcript.get("transcript", {})
        sections = transcript_data.get("sections", [])

        turn_idx = 0
        for section_idx, section in enumerate(sections):
            for turn in section.get("turns", []):
                speaker = turn.get("speaker", {})
                speaker_id = speaker.get("ID") if speaker else None
                speaker_name = speaker.get("name") if speaker else None
                speaker_identifier = speaker.get("identifier") if speaker else None

                # Determine if justice or advocate
                roles = speaker.get("roles", []) if speaker else []
                is_justice = any(r.get("type") == "scotus_justice" for r in (roles or []))

                # Extract speaker role info
                speaker_role = "justice" if is_justice else "advocate"

                # Track justice profiles
                if speaker_id and is_justice and speaker:
                    if speaker_id not in justice_profiles:
                        justice_profiles[speaker_id] = {
                            "justice_id": speaker_id,
                            "name": speaker_name,
                            "identifier": speaker_identifier,
                            "last_name": speaker.get("last_name"),
                            "length_of_service": speaker.get("length_of_service"),
                            "thumbnail_url": speaker.get("thumbnail", {}).get("href") if speaker.get("thumbnail") else None,
                            "roles": []
                        }
                    # Add any new roles
                    for role in (roles or []):
                        role_data = {
                            "role_title": role.get("role_title"),
                            "appointing_president": role.get("appointing_president"),
                            "date_start": unix_to_date(role.get("date_start")),
                            "date_end": unix_to_date(role.get("date_end")) if role.get("date_end") else None,
                        }
                        if role_data not in justice_profiles[speaker_id]["roles"]:
                            justice_profiles[speaker_id]["roles"].append(role_data)

                # Combine all text blocks into single text
                text_blocks = turn.get("text_blocks", [])
                full_text = " ".join(block.get("text", "") for block in text_blocks)

                turn_record = {
                    # Case metadata
                    "oyez_id": case_metadata.get("oyez_id"),
                    "case_name": case_metadata.get("name"),
                    "docket_number": case_metadata.get("docket_number"),
                    "term": case_metadata.get("term"),
                    "us_cite": case_metadata.get("us_cite"),
                    "winning_party": case_metadata.get("winning_party"),

                    # Transcript metadata
                    "transcript_id": transcript_id,
                    "transcript_title": transcript_title,
                    "section_idx": section_idx,
                    "turn_idx": turn_idx,

                    # Speaker info
                    "speaker_id": speaker_id,
                    "speaker_name": speaker_name,
                    "speaker_identifier": speaker_identifier,
                    "speaker_role": speaker_role,
                    "is_justice": is_justice,

                    # Timing
                    "start_time": turn.get("start"),
                    "stop_time": turn.get("stop"),

                    # Content
                    "text": full_text,
                    "text_length": len(full_text),
                }
                turns.append(turn_record)
                turn_idx += 1

    except Exception as e:
        print(f"Error reading transcript {transcript_file}: {e}")

    return turns

def main(test_mode: bool = False, test_limit: int = 5):
    print("Extracting Oyez data...")
    if test_mode:
        print(f"TEST MODE: Processing only {test_limit} transcript files")

    # Find all case files (non-transcript)
    case_files = {}
    transcript_files = []

    for f in OYEZ_DIR.glob("*.json"):
        name = f.stem
        # Check for transcript file pattern: ends with -t## where ## is digits
        if "-t0" in name or "-t1" in name:  # covers -t01 through -t19
            transcript_files.append(f)
        else:
            # Key by the base case identifier
            case_files[name] = f

    print(f"Found {len(case_files)} case files")
    print(f"Found {len(transcript_files)} transcript files")

    # Process transcripts
    all_turns = []
    processed = 0
    skipped_no_case = 0

    # Limit files in test mode
    files_to_process = transcript_files[:test_limit] if test_mode else transcript_files

    for transcript_file in files_to_process:
        # Get corresponding case file
        # e.g., "2020.19-1039-t01" -> "2020.19-1039"
        base_name = transcript_file.stem.rsplit("-t", 1)[0]
        case_file = case_files.get(base_name)

        if case_file:
            case_metadata = extract_case_metadata(case_file)
            if case_metadata:
                turns = extract_transcript(transcript_file, case_metadata)
                all_turns.extend(turns)
                if test_mode:
                    print(f"  Processed: {transcript_file.name} -> {len(turns)} turns")
        else:
            skipped_no_case += 1
            if test_mode:
                print(f"  SKIPPED (no case file): {transcript_file.name}")

        processed += 1
        if processed % 500 == 0:
            print(f"Processed {processed}/{len(files_to_process)} transcripts...")

    print(f"\nExtracted {len(all_turns)} total turns")
    print(f"Found {len(justice_profiles)} unique justices")
    if skipped_no_case > 0:
        print(f"Skipped {skipped_no_case} transcripts (no matching case file)")

    # Write transcript turns
    turns_file = OUTPUT_DIR / "oyez_transcript_turns.jsonl"
    with open(turns_file, 'w', encoding='utf-8') as f:
        for turn in all_turns:
            f.write(json.dumps(turn, ensure_ascii=False) + "\n")
    print(f"Wrote {turns_file}")

    # Write justice profiles
    profiles_file = OUTPUT_DIR / "oyez_justice_profiles.jsonl"
    with open(profiles_file, 'w', encoding='utf-8') as f:
        for profile in justice_profiles.values():
            f.write(json.dumps(profile, ensure_ascii=False) + "\n")
    print(f"Wrote {profiles_file}")

    # Also write a summary of cases with transcripts
    cases_with_transcripts = set()
    for turn in all_turns:
        if turn.get("oyez_id"):
            cases_with_transcripts.add(turn["oyez_id"])
    print(f"\nCases with transcripts: {len(cases_with_transcripts)}")

    # Print sample
    print("\n--- Sample Turn ---")
    if all_turns:
        sample = all_turns[0]
        for k, v in sample.items():
            if k == "text":
                v = v[:100] + "..." if len(str(v)) > 100 else v
            print(f"  {k}: {v}")

    print("\n--- Sample Justice Profile ---")
    if justice_profiles:
        sample = list(justice_profiles.values())[0]
        for k, v in sample.items():
            print(f"  {k}: {v}")

if __name__ == "__main__":
    import sys
    test_mode = "--test" in sys.argv
    main(test_mode=test_mode, test_limit=5)
