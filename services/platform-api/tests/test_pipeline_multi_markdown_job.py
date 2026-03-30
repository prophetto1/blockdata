from __future__ import annotations

import io
import json
import sqlite3
from pathlib import Path
from zipfile import ZipFile

import numpy as np
import pytest

from app.pipelines.markdown_index_builder import (
    EmbeddingSelection,
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


def test_run_multi_markdown_job_preserves_source_order_and_provenance(monkeypatch, tmp_path: Path):
    stages: list[str] = []
    artifact_paths: dict[str, Path] = {}

    monkeypatch.setattr(
        "app.pipelines.markdown_index_builder.load_pipeline_source_set_markdown_members",
        lambda **_kwargs: [
            {
                "source_uid": "src-1",
                "doc_title": "Alpha.md",
                "source_order": 1,
                "markdown_bytes": b"# Alpha\n\nAlpha body.\n",
            },
            {
                "source_uid": "src-2",
                "doc_title": "Beta.md",
                "source_order": 2,
                "markdown_bytes": b"# Beta\n\nBeta body.\n",
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
        destination = tmp_path / kwargs["filename"]
        destination.write_bytes(Path(kwargs["local_path"]).read_bytes())
        artifact_paths[kwargs["deliverable_kind"]] = destination
        return {"deliverable_kind": kwargs["deliverable_kind"], "filename": kwargs["filename"]}

    monkeypatch.setattr("app.pipelines.markdown_index_builder.store_pipeline_artifact", _capture_artifact)

    result = run_markdown_index_builder(job=_job_row(), set_stage=stages.append, heartbeat=lambda: None)

    assert stages[:2] == ["loading_sources", "consolidating"]
    assert result["source_set_member_count"] == 2

    with sqlite3.connect(artifact_paths["lexical_sqlite"]) as conn:
        rows = conn.execute(
            "SELECT source_uid, source_title, source_order FROM sections ORDER BY section_order"
        ).fetchall()

    assert rows[0] == ("src-1", "Alpha.md", 1)
    assert rows[-1] == ("src-2", "Beta.md", 2)

    with ZipFile(artifact_paths["semantic_zip"]) as archive:
        chunk_lines = [json.loads(line) for line in archive.read("chunks.jsonl").decode("utf-8").strip().splitlines()]
        manifest = json.loads(archive.read("manifest.json"))
        _ = np.load(io.BytesIO(archive.read("embeddings.npy")))

    assert chunk_lines[0]["source_uid"] == "src-1"
    assert chunk_lines[-1]["source_uid"] == "src-2"
    assert manifest["source_set_member_count"] == 2


def test_run_multi_markdown_job_fails_at_consolidating_when_one_member_is_invalid(monkeypatch):
    stages: list[str] = []

    monkeypatch.setattr(
        "app.pipelines.markdown_index_builder.load_pipeline_source_set_markdown_members",
        lambda **_kwargs: [
            {
                "source_uid": "src-1",
                "doc_title": "Alpha.md",
                "source_order": 1,
                "markdown_bytes": b"# Alpha\n\nAlpha body.\n",
            },
            {
                "source_uid": "src-2",
                "doc_title": "Broken.md",
                "source_order": 2,
                "markdown_bytes": b"\xff\xfe\xfa",
            },
        ],
    )

    with pytest.raises(ValueError, match="UTF-8"):
        run_markdown_index_builder(job=_job_row(), set_stage=stages.append, heartbeat=lambda: None)

    assert stages == ["loading_sources", "consolidating"]
