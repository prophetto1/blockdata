from __future__ import annotations

import io
import json
import shutil
import sqlite3
from pathlib import Path
from zipfile import ZipFile

import numpy as np
import pytest

from app.pipelines.markdown_index_builder import (
    EmbeddingSelection,
    build_lexical_sqlite_artifact,
    build_semantic_zip_artifact,
    prepare_markdown_index_data,
    run_markdown_index_builder,
)


def _job_row(**overrides):
    row = {
        "job_id": "job-1",
        "pipeline_kind": "markdown_index_builder",
        "owner_id": "user-1",
        "project_id": "project-1",
        "source_uid": "src-1",
        "source_set_id": "set-1",
    }
    row.update(overrides)
    return row


def test_prepare_markdown_index_data_rejects_invalid_utf8():
    with pytest.raises(ValueError, match="UTF-8"):
        prepare_markdown_index_data(b"\xff\xfe\xfa")


def test_prepare_markdown_index_data_derives_stable_section_identity():
    markdown = b"""# Overview

Alpha overview paragraph.

## Details

Detail paragraph one.

# Appendix

Appendix paragraph.
"""

    first = prepare_markdown_index_data(markdown)
    second = prepare_markdown_index_data(markdown)

    assert [section.section_id for section in first.sections] == [
        "sec_0001_4e8ef08a4e29",
        "sec_0002_f516d5c2f462",
        "sec_0003_d84ba0b5e0aa",
    ]
    assert [section.section_id for section in first.sections] == [section.section_id for section in second.sections]
    assert [section.heading_path for section in first.sections] == [
        ["Overview"],
        ["Overview", "Details"],
        ["Appendix"],
    ]
    assert [section.heading_level for section in first.sections] == [1, 2, 1]


def test_prepare_markdown_index_data_chunks_large_sections_without_crossing_size_limit():
    repeated = " ".join(f"token{i}" for i in range(1300))
    markdown = f"""# Large Section

{repeated}
""".encode("utf-8")

    result = prepare_markdown_index_data(markdown)

    assert len(result.sections) == 1
    assert len(result.chunks) >= 2
    assert all(chunk.section_id == result.sections[0].section_id for chunk in result.chunks)
    assert max(chunk.token_count for chunk in result.chunks) <= 1024
    assert result.chunks[0].ordinal == 1
    assert result.chunks[-1].ordinal == len(result.chunks)


def test_prepare_markdown_index_data_emits_stage_callbacks_in_order():
    stages: list[str] = []
    markdown = b"""# Intro

Short body.
"""

    result = prepare_markdown_index_data(markdown, stage_callback=stages.append)

    assert stages == ["parsing", "normalizing", "structuring", "chunking"]
    assert result.normalized_markdown.endswith("\n")
    assert len(result.sections) == 1
    assert len(result.chunks) == 1


def test_build_lexical_sqlite_artifact_contains_required_tables(tmp_path: Path):
    prepared = prepare_markdown_index_data(
        b"""# Intro

Short body.

## Followup

More text here.
"""
    )
    output_path = tmp_path / "asset.lexical.sqlite"

    build_lexical_sqlite_artifact(
        prepared,
        output_path=output_path,
        source_uid="src-1",
        pipeline_kind="markdown_index_builder",
    )

    with sqlite3.connect(output_path) as conn:
        tables = {
            row[0]
            for row in conn.execute("SELECT name FROM sqlite_master WHERE type IN ('table', 'view')")
        }
        document_row = conn.execute(
            "SELECT source_uid, pipeline_kind, section_count, chunk_count FROM document"
        ).fetchone()
        chunk_row = conn.execute(
            "SELECT source_uid, source_title, source_order, source_heading_path FROM chunks ORDER BY ordinal LIMIT 1"
        ).fetchone()

    assert {"document", "sections", "chunks", "chunks_fts", "manifest"} <= tables
    assert document_row == ("src-1", "markdown_index_builder", len(prepared.sections), len(prepared.chunks))
    assert chunk_row == ("src-1", "Document", 1, "[]")


def test_build_semantic_zip_artifact_contains_required_files(tmp_path: Path):
    prepared = prepare_markdown_index_data(
        b"""# Intro

Short body.

## Followup

More text here.
"""
    )
    embeddings = np.arange(len(prepared.chunks) * 4, dtype=np.float32).reshape(len(prepared.chunks), 4)
    output_path = tmp_path / "asset.semantic.zip"

    build_semantic_zip_artifact(
        prepared,
        embeddings=embeddings,
        output_path=output_path,
        pipeline_kind="markdown_index_builder",
        source_uid="src-1",
        embedding_provider="openai",
        embedding_model="text-embedding-3-small",
    )

    with ZipFile(output_path) as archive:
        members = set(archive.namelist())
        manifest = json.loads(archive.read("manifest.json"))
        chunk_map = json.loads(archive.read("chunk_id_map.json"))
        loaded_embeddings = np.load(io.BytesIO(archive.read("embeddings.npy")))
        chunk_lines = archive.read("chunks.jsonl").decode("utf-8").strip().splitlines()
        first_chunk = json.loads(chunk_lines[0])

    assert {"manifest.json", "chunks.jsonl", "embeddings.npy", "chunk_id_map.json"} <= members
    assert manifest["embedding_provider"] == "openai"
    assert manifest["embedding_model"] == "text-embedding-3-small"
    assert manifest["chunk_count"] == len(prepared.chunks)
    assert chunk_map[prepared.chunks[0].chunk_id] == 0
    assert loaded_embeddings.shape == embeddings.shape
    assert len(chunk_lines) == len(prepared.chunks)
    assert first_chunk["source_uid"] == "src-1"
    assert first_chunk["source_title"] == "Document"
    assert first_chunk["source_order"] == 1


def test_run_markdown_index_builder_fails_at_embedding_when_no_credential(monkeypatch):
    stages: list[str] = []

    monkeypatch.setattr(
        "app.pipelines.markdown_index_builder.load_pipeline_source_set_markdown_members",
        lambda **_kwargs: [
            {
                "source_uid": "src-1",
                "doc_title": "Intro.md",
                "source_order": 1,
                "markdown_bytes": b"""# Intro

Short body.
""",
            }
        ],
    )
    monkeypatch.setattr(
        "app.pipelines.markdown_index_builder.resolve_embedding_selection",
        lambda **_kwargs: (_ for _ in ()).throw(RuntimeError("No usable embedding credential configured")),
    )

    with pytest.raises(RuntimeError, match="No usable embedding credential configured"):
        run_markdown_index_builder(
            job=_job_row(),
            set_stage=stages.append,
            heartbeat=lambda: None,
        )

    assert stages[:6] == ["loading_sources", "consolidating", "parsing", "normalizing", "structuring", "chunking"]
    assert stages[-1] == "embedding"


def test_run_markdown_index_builder_returns_deliverables_and_embedding_snapshot(
    monkeypatch,
    tmp_path: Path,
):
    stages: list[str] = []
    stored_artifacts: dict[str, dict] = {}

    monkeypatch.setattr(
        "app.pipelines.markdown_index_builder.load_pipeline_source_set_markdown_members",
        lambda **_kwargs: [
            {
                "source_uid": "src-1",
                "doc_title": "Intro.md",
                "source_order": 1,
                "markdown_bytes": b"""# Intro

Short body.
""",
            },
            {
                "source_uid": "src-2",
                "doc_title": "Followup.md",
                "source_order": 2,
                "markdown_bytes": b"""# Followup

More text here.
""",
            },
        ],
    )
    monkeypatch.setattr(
        "app.pipelines.markdown_index_builder.resolve_embedding_selection",
        lambda **_kwargs: EmbeddingSelection(
            provider="openai",
            model_id="text-embedding-3-small",
            dimensions=4,
            api_key="secret",
            base_url=None,
        ),
    )
    monkeypatch.setattr(
        "app.pipelines.markdown_index_builder.embed_pipeline_chunks",
        lambda *, chunks, selection, heartbeat: np.ones((len(chunks), selection.dimensions), dtype=np.float32),
    )

    def _capture_artifact(**kwargs):
        local_path = Path(kwargs["local_path"])
        destination = tmp_path / kwargs["filename"]
        shutil.copy2(local_path, destination)
        stored_artifacts[kwargs["deliverable_kind"]] = {
            "path": destination,
            "metadata_jsonb": kwargs["metadata_jsonb"],
            "content_type": kwargs["content_type"],
        }
        return {"deliverable_kind": kwargs["deliverable_kind"], "filename": kwargs["filename"]}

    monkeypatch.setattr("app.pipelines.markdown_index_builder.store_pipeline_artifact", _capture_artifact)

    result = run_markdown_index_builder(
        job=_job_row(),
        set_stage=stages.append,
        heartbeat=lambda: None,
    )

    assert stages == [
        "loading_sources",
        "consolidating",
        "parsing",
        "normalizing",
        "structuring",
        "chunking",
        "lexical_indexing",
        "embedding",
        "packaging",
    ]
    assert result["deliverable_kinds"] == ["lexical_sqlite", "semantic_zip"]
    assert result["embedding_provider"] == "openai"
    assert result["embedding_model"] == "text-embedding-3-small"
    assert result["section_count"] >= 2
    assert result["chunk_count"] >= 2
    assert result["source_set_member_count"] == 2
    assert stored_artifacts["lexical_sqlite"]["content_type"] == "application/vnd.sqlite3"
    assert stored_artifacts["semantic_zip"]["content_type"] == "application/zip"
    assert stored_artifacts["lexical_sqlite"]["path"].name == "asset.lexical.sqlite"
    assert stored_artifacts["semantic_zip"]["path"].name == "asset.semantic.zip"
