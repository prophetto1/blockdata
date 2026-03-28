from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.api.routes.storage import (
    _is_reservation_expired,
    _safe_path_segment,
    build_object_key,
    enforce_per_file_limit,
)


def test_safe_path_segment_rejects_invalid_values():
    assert _safe_path_segment("  ", field_name="field") == "  "
    with pytest.raises(ValueError, match="project_id is required"):
        _safe_path_segment("", field_name="project_id")
    with pytest.raises(ValueError, match="source_uid is required"):
        _safe_path_segment(".", field_name="source_uid")
    with pytest.raises(ValueError, match="upload_id is required"):
        _safe_path_segment("..", field_name="upload_id")


def test_safe_path_segment_sanitizes_nested_segments():
    assert _safe_path_segment("a/b/c", field_name="source_uid") == "c"
    with pytest.raises(ValueError, match="upload_id is required"):
        _safe_path_segment("..", field_name="upload_id")
    assert _safe_path_segment("a/../b", field_name="upload_id") == "b"


def test_build_object_key_uses_storage_kind_paths():
    source_key = build_object_key(
        user_id="u1",
        project_id="project-1",
        filename="notes.txt",
        storage_kind="source",
        source_uid="src/a",
        artifact_name="artifact.pdf",
    )
    assert source_key == "users/u1/assets/projects/project-1/sources/a/source/artifact.pdf"

    pipeline_source_key = build_object_key(
        user_id="u1",
        project_id="project-1",
        filename="notes.txt",
        storage_kind="source",
        source_uid="src/a",
        artifact_name="artifact.pdf",
        storage_surface="pipeline-services",
        storage_service_slug="index-builder",
    )
    assert (
        pipeline_source_key
        == "users/u1/pipeline-services/index-builder/projects/project-1/sources/a/source/artifact.pdf"
    )

    export_key = build_object_key(
        user_id="u1",
        project_id="project-1",
        filename="report.md",
        storage_kind="export",
        upload_id="upl_1",
    )
    assert export_key == "users/u1/projects/project-1/exports/upl_1/report.md"


def test_build_object_key_requires_fields_by_storage_kind():
    with pytest.raises(ValueError, match="source_uid is required"):
        build_object_key(
            user_id="u1",
            project_id="p1",
            filename="notes.txt",
            storage_kind="source",
        )

    with pytest.raises(ValueError, match="upload_id is required"):
        build_object_key(
            user_id="u1",
            project_id="p1",
            filename="notes.txt",
            storage_kind="export",
        )


def test_enforce_per_file_limit():
    enforce_per_file_limit(10, 20)
    with pytest.raises(ValueError):
        enforce_per_file_limit(21, 20)


def test_is_reservation_expired():
    now = datetime.now(timezone.utc)
    assert not _is_reservation_expired({"expires_at": (now + timedelta(minutes=5)).isoformat()})
    assert _is_reservation_expired({"expires_at": (now - timedelta(minutes=5)).isoformat()})
    assert not _is_reservation_expired({})
    assert _is_reservation_expired({"expires_at": "not-a-date"})
