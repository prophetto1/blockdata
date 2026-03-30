from __future__ import annotations

import pytest

from app.auth.principals import AuthPrincipal


def _user_auth() -> AuthPrincipal:
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated"}),
        auth_source="test",
    )


@pytest.mark.asyncio
async def test_list_pipeline_source_sets_returns_saved_sets(monkeypatch):
    from app.api.routes.pipelines import list_pipeline_source_sets

    monkeypatch.setattr("app.api.routes.pipelines.get_supabase_admin", lambda: object())
    monkeypatch.setattr("app.api.routes.pipelines._assert_project_ownership", lambda *_a, **_k: None)
    monkeypatch.setattr(
        "app.api.routes.pipelines.pipeline_source_sets_service.list_source_sets",
        lambda *_a, **_k: [
            {
                "source_set_id": "set-1",
                "project_id": "project-1",
                "label": "Release corpus",
                "member_count": 3,
                "total_bytes": 4096,
                "updated_at": "2026-03-30T09:00:00Z",
                "latest_job": None,
            }
        ],
    )

    result = await list_pipeline_source_sets("markdown_index_builder", "project-1", _user_auth())

    assert result == {
        "items": [
            {
                "source_set_id": "set-1",
                "project_id": "project-1",
                "label": "Release corpus",
                "member_count": 3,
                "total_bytes": 4096,
                "updated_at": "2026-03-30T09:00:00Z",
                "latest_job": None,
            }
        ]
    }


@pytest.mark.asyncio
async def test_create_pipeline_source_set_returns_detail_shape(monkeypatch):
    from app.api.routes.pipelines import CreatePipelineSourceSetRequest, create_pipeline_source_set

    monkeypatch.setattr("app.api.routes.pipelines.get_supabase_admin", lambda: object())
    monkeypatch.setattr("app.api.routes.pipelines._assert_project_ownership", lambda *_a, **_k: None)
    monkeypatch.setattr(
        "app.api.routes.pipelines.pipeline_source_sets_service.create_source_set",
        lambda *_a, **_k: {
            "source_set_id": "set-1",
            "project_id": "project-1",
            "label": "Release corpus",
            "member_count": 2,
            "total_bytes": 300,
            "items": [
              {
                "source_uid": "src-1",
                "doc_title": "Guide.md",
                "source_type": "md",
                "byte_size": 120,
                "source_order": 1,
                "object_key": "users/user-1/assets/projects/project-1/sources/src-1/source/guide.md",
              },
              {
                "source_uid": "src-2",
                "doc_title": "Notes.md",
                "source_type": "md",
                "byte_size": 180,
                "source_order": 2,
                "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-2/source/notes.md",
              },
            ],
            "latest_job": None,
        },
    )

    result = await create_pipeline_source_set(
        "markdown_index_builder",
        CreatePipelineSourceSetRequest(
            project_id="project-1",
            label="Release corpus",
            source_uids=["src-1", "src-2"],
        ),
        _user_auth(),
    )

    assert result["source_set"]["source_set_id"] == "set-1"
    assert result["source_set"]["member_count"] == 2
    assert [item["source_uid"] for item in result["source_set"]["items"]] == ["src-1", "src-2"]


@pytest.mark.asyncio
async def test_update_pipeline_source_set_replaces_membership_when_source_uids_present(monkeypatch):
    from app.api.routes.pipelines import UpdatePipelineSourceSetRequest, update_pipeline_source_set

    monkeypatch.setattr("app.api.routes.pipelines.get_supabase_admin", lambda: object())
    monkeypatch.setattr(
        "app.api.routes.pipelines.pipeline_source_sets_service.update_source_set",
        lambda *_a, **_k: {
            "source_set_id": "set-1",
            "project_id": "project-1",
            "label": "Release corpus v2",
            "member_count": 1,
            "total_bytes": 180,
            "items": [
                {
                    "source_uid": "src-2",
                    "doc_title": "Notes.md",
                    "source_type": "md",
                    "byte_size": 180,
                    "source_order": 1,
                    "object_key": "users/user-1/pipeline-services/index-builder/projects/project-1/sources/src-2/source/notes.md",
                }
            ],
            "latest_job": None,
        },
    )

    result = await update_pipeline_source_set(
        "markdown_index_builder",
        "set-1",
        UpdatePipelineSourceSetRequest(label="Release corpus v2", source_uids=["src-2"]),
        _user_auth(),
    )

    assert result["source_set"]["label"] == "Release corpus v2"
    assert result["source_set"]["member_count"] == 1
    assert result["source_set"]["items"][0]["source_uid"] == "src-2"
