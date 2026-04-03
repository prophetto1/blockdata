from __future__ import annotations

import pytest
from fastapi import HTTPException


class AuthStub:
    def __init__(self, user_id: str):
        self.user_id = user_id


class _Query:
    def __init__(self, rows: list[dict]):
        self._rows = rows
        self._filters: dict[str, object] = {}

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, key: str, value: object):
        self._filters[key] = value
        return self

    def maybe_single(self):
        return self

    def execute(self):
        row = None
        for candidate in self._rows:
            if all(candidate.get(key) == value for key, value in self._filters.items()):
                row = dict(candidate)
                break
        return type("R", (), {"data": row})()


class _Admin:
    def __init__(self, rows: list[dict]):
        self._rows = rows

    def table(self, name: str):
        assert name == "storage_objects"
        return _Query(self._rows)


@pytest.mark.asyncio
async def test_create_download_url_returns_signed_gcs_url_for_owned_object(monkeypatch):
    from app.api.routes.storage import CreateDownloadUrlRequest, create_download_url

    recorded: list[dict] = []
    monkeypatch.setattr(
        "app.api.routes.storage.get_supabase_admin",
        lambda: _Admin(
            [
                {
                    "storage_object_id": "obj-1",
                    "owner_user_id": "user-1",
                    "bucket": "unit-bucket",
                    "object_key": "users/user-1/assets/projects/project-1/sources/src-1/source/guide.md",
                    "status": "active",
                }
            ]
        ),
    )
    monkeypatch.setattr(
        "app.api.routes.storage.create_signed_download_url",
        lambda *, bucket_name, object_key: recorded.append(
            {"bucket_name": bucket_name, "object_key": object_key}
        )
        or "https://gcs.test/download",
    )
    monkeypatch.setattr("app.api.routes.storage.record_storage_download_sign", lambda **_kwargs: None)

    result = await create_download_url(
        CreateDownloadUrlRequest(
            object_key="users/user-1/assets/projects/project-1/sources/src-1/source/guide.md"
        ),
        AuthStub("user-1"),
    )

    assert result == {
        "signed_url": "https://gcs.test/download",
        "expires_in_seconds": 1800,
    }
    assert recorded == [
        {
            "bucket_name": "unit-bucket",
            "object_key": "users/user-1/assets/projects/project-1/sources/src-1/source/guide.md",
        }
    ]


@pytest.mark.asyncio
async def test_create_download_url_returns_404_when_object_key_is_missing(monkeypatch):
    from app.api.routes.storage import CreateDownloadUrlRequest, create_download_url

    monkeypatch.setattr("app.api.routes.storage.get_supabase_admin", lambda: _Admin([]))
    monkeypatch.setattr("app.api.routes.storage.record_storage_download_sign", lambda **_kwargs: None)

    with pytest.raises(HTTPException) as exc:
        await create_download_url(
            CreateDownloadUrlRequest(
                object_key="users/user-1/assets/projects/project-1/sources/src-1/source/missing.md"
            ),
            AuthStub("user-1"),
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == "Object not found"


@pytest.mark.asyncio
async def test_create_download_url_returns_404_for_unowned_object(monkeypatch):
    from app.api.routes.storage import CreateDownloadUrlRequest, create_download_url

    monkeypatch.setattr(
        "app.api.routes.storage.get_supabase_admin",
        lambda: _Admin(
            [
                {
                    "storage_object_id": "obj-1",
                    "owner_user_id": "user-2",
                    "bucket": "unit-bucket",
                    "object_key": "users/user-2/assets/projects/project-1/sources/src-1/source/private.md",
                    "status": "active",
                }
            ]
        ),
    )
    monkeypatch.setattr("app.api.routes.storage.record_storage_download_sign", lambda **_kwargs: None)

    with pytest.raises(HTTPException) as exc:
        await create_download_url(
            CreateDownloadUrlRequest(
                object_key="users/user-2/assets/projects/project-1/sources/src-1/source/private.md"
            ),
            AuthStub("user-1"),
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == "Object not found"
