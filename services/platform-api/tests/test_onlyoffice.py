from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.auth.principals import AuthPrincipal
from app.api.routes.onlyoffice import OpenRequest, open_document

class _FakeSupabaseQuery:
    def select(self, _columns: str):
        return self

    def eq(self, _column: str, _value: str):
        return self

    def limit(self, _value: int):
        return self

    def execute(self):
        return SimpleNamespace(
            data=[
                {
                    "source_uid": "source-1",
                    "source_locator": "projects/project-1/source/report.docx",
                    "doc_title": "report.docx",
                    "owner_id": "m2m-caller",
                }
            ]
        )


class _FakeSupabaseClient:
    def table(self, _name: str):
        return _FakeSupabaseQuery()


def test_settings_default_onlyoffice_storage_dir_is_tmp(monkeypatch):
    monkeypatch.delenv("ONLYOFFICE_STORAGE_DIR", raising=False)

    from app.core.config import get_settings

    get_settings.cache_clear()
    assert get_settings().onlyoffice_storage_dir == "/tmp/onlyoffice-cache"


@pytest.mark.asyncio
async def test_open_returns_json_error_when_session_cache_init_fails(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "test-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    monkeypatch.setenv("ONLYOFFICE_JWT_SECRET", "test-onlyoffice-secret")

    from app.core.config import get_settings

    get_settings.cache_clear()

    async def fake_download_from_storage(*_args, **_kwargs):
        return b"fake-docx-bytes"

    auth = AuthPrincipal(
        subject_type="machine",
        subject_id="m2m-caller",
        roles=frozenset({"platform_admin"}),
        auth_source="m2m_bearer",
    )

    with patch("app.api.routes.onlyoffice.get_supabase_admin", return_value=_FakeSupabaseClient()):
        with patch("app.api.routes.onlyoffice.download_from_storage", fake_download_from_storage):
            with patch(
                "app.api.routes.onlyoffice._session_doc_path",
                side_effect=PermissionError("permission denied"),
            ):
                with pytest.raises(HTTPException) as exc_info:
                    await open_document(OpenRequest(source_uid="source-1"), auth)

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "Failed to initialize local OnlyOffice session cache"
