"""Tests for conversion repository — monkeypatches Supabase client."""
import hashlib
import pytest
from unittest.mock import MagicMock, patch

from app.domain.conversion.repository import (
    insert_representation,
    mark_source_status,
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
    insert_representation(
        source_uid="src-1",
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
    assert len(row["conv_uid"]) == 64


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
