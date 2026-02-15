from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import taxonomy  # noqa: E402


def test_map_raw_element_type_known_values():
    assert taxonomy.map_raw_element_type("Title") == "heading"
    assert taxonomy.map_raw_element_type("NarrativeText") == "paragraph"
    assert taxonomy.map_raw_element_type("Table") == "table"


def test_map_raw_element_type_unknown_value_falls_back_to_other():
    assert taxonomy.map_raw_element_type("CompletelyUnknownType") == "other"


def test_taxonomy_mapping_version_is_locked():
    assert taxonomy.TAXONOMY_MAPPING_VERSION == "2026-02-14"
