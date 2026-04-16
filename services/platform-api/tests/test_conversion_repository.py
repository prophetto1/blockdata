"""Tests for conversion repository — monkeypatches Supabase client."""
import hashlib
import pytest
from unittest.mock import MagicMock, patch

from app.domain.conversion.repository import (
    build_representation_artifact_hash,
    clear_conversion_state_for_source,
    insert_representation,
    insert_representation_record,
    mark_source_status,
    upsert_blocks,
    upsert_conversion_parsing,
)


@pytest.fixture
def mock_supabase():
    client = MagicMock()
    # Chain: client.table("x").upsert(...).execute()
    chain = MagicMock()
    chain.execute.return_value = MagicMock(data=[{"id": "test"}])
    client.table.return_value.upsert.return_value = chain
    client.table.return_value.update.return_value.eq.return_value = chain
    client.table.return_value.insert.return_value = chain
    with patch("app.domain.conversion.repository.get_supabase_admin", return_value=client):
        yield client


def test_insert_representation_writes_row(mock_supabase):
    conv_uid = hashlib.sha256(b"tree_sitter\nsrc-1\njob-1").hexdigest()
    insert_representation(
        source_uid="src-1",
        conv_uid=conv_uid,
        parsing_tool="tree_sitter",
        representation_type="tree_sitter_ast_json",
        artifact_locator="converted/src-1/Foo.ast.json",
        artifact_bytes=b'{"type":"program"}',
    )
    mock_supabase.table.assert_called_with("conversion_representations")
    call_args = mock_supabase.table.return_value.upsert.call_args
    row = call_args[0][0]
    assert row["source_uid"] == "src-1"
    assert row["parsing_tool"] == "tree_sitter"
    assert row["representation_type"] == "tree_sitter_ast_json"
    assert row["artifact_locator"] == "converted/src-1/Foo.ast.json"
    assert row["artifact_size_bytes"] == len(b'{"type":"program"}')
    assert len(row["artifact_hash"]) == 64  # SHA-256 hex
    assert row["conv_uid"] == conv_uid


def test_insert_representation_record_preserves_explicit_hash_and_size(mock_supabase):
    insert_representation_record(
        source_uid="src-1",
        conv_uid="conv-1",
        parsing_tool="docling",
        representation_type="doclingdocument_json",
        artifact_locator="converted/src-1/doc.docling.json",
        artifact_hash="prefixed-hash",
        artifact_size_bytes=321,
        artifact_meta={"source_type": "pdf"},
    )
    row = mock_supabase.table.return_value.upsert.call_args[0][0]
    assert row["conv_uid"] == "conv-1"
    assert row["artifact_hash"] == "prefixed-hash"
    assert row["artifact_size_bytes"] == 321
    assert row["artifact_meta"] == {"source_type": "pdf"}


def test_build_representation_artifact_hash_uses_tool_and_representation_prefix():
    payload = b"example"
    digest = hashlib.sha256()
    digest.update(b"docling\nmarkdown_bytes\n")
    digest.update(payload)
    assert (
        build_representation_artifact_hash("docling", "markdown_bytes", payload)
        == digest.hexdigest()
    )


def test_mark_source_status(mock_supabase):
    mark_source_status("src-1", "parsed")
    mock_supabase.table.assert_called_with("source_documents")


def test_mark_source_status_with_job_id(mock_supabase):
    mark_source_status("src-1", "converting", conversion_job_id="job-123")
    call_args = mock_supabase.table.return_value.update.call_args
    update = call_args[0][0]
    assert update["status"] == "converting"
    assert update["conversion_job_id"] == "job-123"


def test_upsert_conversion_parsing(mock_supabase):
    upsert_conversion_parsing(
        source_uid="src-1",
        conv_parsing_tool="tree_sitter",
        pipeline_config={"language": "java"},
        parser_runtime_meta={"node_count": 42},
    )
    mock_supabase.table.assert_called_with("conversion_parsing")
    call_args = mock_supabase.table.return_value.upsert.call_args
    row = call_args[0][0]
    assert len(row["conv_uid"]) == 64
    assert row["conv_parsing_tool"] == "tree_sitter"
    assert row["conv_status"] == "success"


def test_upsert_conversion_parsing_preserves_explicit_conv_fields(mock_supabase):
    conv_uid = hashlib.sha256(b"tree_sitter\nsrc-1\nast").hexdigest()
    upsert_conversion_parsing(
        source_uid="src-1",
        conv_parsing_tool="tree_sitter",
        conv_uid=conv_uid,
        conv_locator="converted/src-1/src-1.ast.json",
        conv_total_blocks=0,
        conv_total_characters=128,
    )
    call_args = mock_supabase.table.return_value.upsert.call_args
    row = call_args[0][0]
    assert row["conv_uid"] == conv_uid
    assert row["conv_locator"] == "converted/src-1/src-1.ast.json"
    assert row["conv_total_blocks"] == 0
    assert row["conv_total_characters"] == 128


def test_upsert_conversion_parsing_preserves_docling_metadata(mock_supabase):
    upsert_conversion_parsing(
        source_uid="src-1",
        conv_parsing_tool="docling",
        conv_uid="conv-1",
        conv_locator="converted/src-1/doc.docling.json",
        conv_total_blocks=3,
        conv_total_characters=42,
        conv_representation_type="doclingdocument_json",
        conv_block_type_freq={"paragraph": 2, "table": 1},
        pipeline_config={"ocr": {"enabled": False}},
        requested_pipeline_config={"ocr": {"enabled": False}},
        applied_pipeline_config={"ocr": {"enabled": False}},
        parser_runtime_meta={"track": "docling"},
    )
    row = mock_supabase.table.return_value.upsert.call_args[0][0]
    assert row["conv_representation_type"] == "doclingdocument_json"
    assert row["conv_block_type_freq"] == {"paragraph": 2, "table": 1}
    assert row["requested_pipeline_config"] == {"ocr": {"enabled": False}}
    assert row["applied_pipeline_config"] == {"ocr": {"enabled": False}}


def test_upsert_blocks_formats_docling_rows():
    client = MagicMock()
    chain = MagicMock()
    chain.execute.return_value = MagicMock(data=[])
    client.table.return_value.upsert.return_value = chain

    with patch("app.domain.conversion.repository.get_supabase_admin", return_value=client):
        upsert_blocks(
            "conv-1",
            [
                {
                    "block_type": "paragraph",
                    "block_content": "Hello",
                    "pointer": "#/texts/0",
                    "page_no": 1,
                    "page_nos": [1],
                    "parser_block_type": "paragraph",
                    "parser_path": "#/texts/0",
                }
            ],
        )

    client.table.assert_called_with("blocks")
    rows = client.table.return_value.upsert.call_args[0][0]
    assert rows[0]["block_uid"] == "conv-1:0"
    assert rows[0]["block_locator"]["pointer"] == "#/texts/0"
    assert rows[0]["block_locator"]["page_no"] == 1
    assert rows[0]["block_content"] == "Hello"


def test_clear_conversion_state_for_source_deletes_blocks_representation_and_parsing_rows():
    client = MagicMock()
    delete_chains: dict[str, MagicMock] = {}

    def table_side_effect(name):
        table = MagicMock()
        if name == "conversion_parsing":
            select_chain = MagicMock()
            select_chain.execute.return_value = MagicMock(data={"conv_uid": "conv-1"})
            table.select.return_value.eq.return_value.maybe_single.return_value = select_chain
        delete_chain = MagicMock()
        delete_chain.eq.return_value = delete_chain
        delete_chain.execute.return_value = MagicMock(data=[])
        table.delete.return_value = delete_chain
        delete_chains[name] = delete_chain
        return table

    client.table.side_effect = table_side_effect

    with patch("app.domain.conversion.repository.get_supabase_admin", return_value=client):
        clear_conversion_state_for_source("src-1", parsing_tool="tree_sitter")

    client.table.assert_any_call("blocks")
    client.table.assert_any_call("conversion_representations")
    client.table.assert_any_call("conversion_parsing")

    blocks_delete = delete_chains["blocks"]
    representation_delete = delete_chains["conversion_representations"]
    parsing_delete = delete_chains["conversion_parsing"]

    assert blocks_delete.eq.call_args_list[0].args == ("conv_uid", "conv-1")
    assert representation_delete.eq.call_args_list[0].args == ("source_uid", "src-1")
    assert representation_delete.eq.call_args_list[1].args == ("parsing_tool", "tree_sitter")
    assert parsing_delete.eq.call_args_list[0].args == ("source_uid", "src-1")
