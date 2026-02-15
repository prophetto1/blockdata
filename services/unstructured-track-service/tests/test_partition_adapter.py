from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import partition_adapter  # noqa: E402


def test_filter_partition_parameters_uses_supported_field_set(monkeypatch):
    monkeypatch.setattr(
        partition_adapter,
        "get_sdk_partition_parameter_fields",
        lambda: {"coordinates", "strategy", "unique_element_ids"},
    )
    filtered = partition_adapter.filter_partition_parameters(
        {
            "coordinates": True,
            "strategy": "auto",
            "unique_element_ids": False,
            "chunking_strategy": "by_title",
        }
    )
    assert filtered == {
        "coordinates": True,
        "strategy": "auto",
        "unique_element_ids": False,
    }


def test_partition_document_bytes_mode_sdk_uses_sdk(monkeypatch):
    monkeypatch.setenv("TRACK_B_PARTITION_MODE", "sdk")
    monkeypatch.setattr(
        partition_adapter,
        "partition_with_sdk",
        lambda **_: [{"type": "NarrativeText", "text": "sdk"}],
    )
    elements, backend = partition_adapter.partition_document_bytes(
        filename="sample.txt",
        content=b"hello",
        source_uid="abc",
        source_type="txt",
        source_locator="sample.txt",
        doc_title="sample",
        partition_parameters={"coordinates": False},
    )
    assert backend == "sdk"
    assert elements[0]["text"] == "sdk"


def test_partition_document_bytes_auto_falls_back_to_local(monkeypatch):
    monkeypatch.setenv("TRACK_B_PARTITION_MODE", "auto")
    monkeypatch.setenv("UNSTRUCTURED_API_URL", "https://example.test")

    def _raise_sdk(**_):
        raise partition_adapter.PartitionAdapterError("sdk failed")

    monkeypatch.setattr(partition_adapter, "partition_with_sdk", _raise_sdk)
    monkeypatch.setattr(
        partition_adapter,
        "partition_with_local_unstructured",
        lambda **_: [{"type": "NarrativeText", "text": "local"}],
    )

    elements, backend = partition_adapter.partition_document_bytes(
        filename="sample.txt",
        content=b"hello",
        source_uid="abc",
        source_type="txt",
        source_locator="sample.txt",
        doc_title="sample",
        partition_parameters={"coordinates": False},
    )
    assert backend == "local"
    assert elements[0]["text"] == "local"


def test_partition_document_bytes_auto_falls_back_to_mock(monkeypatch):
    monkeypatch.setenv("TRACK_B_PARTITION_MODE", "auto")
    monkeypatch.delenv("UNSTRUCTURED_API_URL", raising=False)
    monkeypatch.setattr(
        partition_adapter,
        "partition_with_local_unstructured",
        lambda **_: (_ for _ in ()).throw(partition_adapter.PartitionAdapterError("local failed")),
    )

    elements, backend = partition_adapter.partition_document_bytes(
        filename="sample.txt",
        content=b"hello",
        source_uid="abc",
        source_type="txt",
        source_locator="sample.txt",
        doc_title="sample",
        partition_parameters={"coordinates": False},
    )
    assert backend == "mock"
    assert elements[0]["type"] in ("Title", "NarrativeText")
