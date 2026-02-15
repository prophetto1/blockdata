from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.partition import build_partition_elements  # noqa: E402


def test_build_partition_elements_uses_title_first():
    elements = build_partition_elements(
        source_uid="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        source_type="pdf",
        doc_title="Sample Title",
        source_locator="uploads/doc.pdf",
        include_coordinates=True,
        unique_element_ids=False,
    )
    assert len(elements) >= 2
    assert elements[0]["type"] == "Title"
    assert elements[0]["text"] == "Sample Title"
    assert isinstance(elements[0]["element_id"], str)
    assert len(elements[0]["element_id"]) == 32
    assert "metadata" in elements[0]
    assert "coordinates" in elements[0]["metadata"]


def test_build_partition_elements_without_title_has_narrative():
    elements = build_partition_elements(
        source_uid="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        source_type="docx",
        doc_title=None,
        source_locator="uploads/doc.docx",
        include_coordinates=False,
        unique_element_ids=False,
    )
    assert len(elements) == 1
    assert elements[0]["type"] == "NarrativeText"
    assert "coordinates" not in elements[0]["metadata"]


def test_build_partition_elements_unique_ids_mode_changes_element_ids():
    source_uid = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    deterministic = build_partition_elements(
        source_uid=source_uid,
        source_type="pdf",
        doc_title="Sample Title",
        source_locator="uploads/doc.pdf",
        include_coordinates=False,
        unique_element_ids=False,
    )
    unique = build_partition_elements(
        source_uid=source_uid,
        source_type="pdf",
        doc_title="Sample Title",
        source_locator="uploads/doc.pdf",
        include_coordinates=False,
        unique_element_ids=True,
    )
    assert deterministic[0]["element_id"] != unique[0]["element_id"]
    assert len(unique[0]["element_id"]) == 36
