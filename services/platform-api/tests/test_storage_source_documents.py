from __future__ import annotations

from pathlib import Path

from app.services.storage_source_documents import upsert_source_document_for_storage_object


MIGRATIONS_DIR = Path(__file__).resolve().parents[3] / "supabase" / "migrations"


class _FakeQuery:
    def __init__(self, admin):
        self._admin = admin

    def upsert(self, payload, on_conflict):
        self._admin.upsert_payload = payload
        self._admin.on_conflict = on_conflict
        return self

    def execute(self):
        return self


class _FakeSupabaseAdmin:
    def __init__(self):
        self.table_name = None
        self.upsert_payload = None
        self.on_conflict = None

    def table(self, name):
        self.table_name = name
        return _FakeQuery(self)


def test_upsert_source_document_for_storage_object_builds_expected_payload():
    admin = _FakeSupabaseAdmin()

    upsert_source_document_for_storage_object(
        admin,
        owner_id="user-1",
        project_id="project-1",
        source_uid="abc123",
        source_type="pdf",
        doc_title="Outline",
        object_key="users/user-1/projects/project-1/sources/abc123/source/outline.pdf",
        bytes_used=1234,
        document_surface="assets",
        storage_object_id="obj-1",
    )

    assert admin.table_name == "source_documents"
    assert admin.on_conflict == "source_uid"
    assert admin.upsert_payload == {
        "source_uid": "abc123",
        "owner_id": "user-1",
        "project_id": "project-1",
        "source_type": "pdf",
        "source_filesize": 1234,
        "source_total_characters": None,
        "source_locator": "users/user-1/projects/project-1/sources/abc123/source/outline.pdf",
        "doc_title": "Outline",
        "status": "uploaded",
        "conversion_job_id": None,
        "error": None,
        "document_surface": "assets",
        "storage_object_id": "obj-1",
    }


def test_storage_source_document_bridge_migration_drops_old_reserve_user_storage_overload():
    text = (MIGRATIONS_DIR / "20260321130000_storage_source_document_bridge.sql").read_text(encoding="utf-8")
    normalized = " ".join(text.split())

    assert (
        "DROP FUNCTION IF EXISTS public.reserve_user_storage("
        "UUID, UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT"
        ");"
    ) in normalized


def test_followup_migration_recreates_current_reserve_user_storage_signature():
    matches = sorted(MIGRATIONS_DIR.glob("*_drop_old_reserve_user_storage_overload.sql"))
    assert len(matches) == 1

    normalized = " ".join(matches[0].read_text(encoding="utf-8").split())

    assert (
        "DROP FUNCTION IF EXISTS public.reserve_user_storage("
        "UUID, UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT"
        ");"
    ) in normalized
    assert "p_source_type TEXT DEFAULT NULL" in normalized
    assert "p_doc_title TEXT DEFAULT NULL" in normalized
    assert "('source', 'converted', 'parsed', 'export', 'pipeline')" in normalized


def test_namespace_metadata_foundation_migration_adds_surface_columns_and_signature():
    text = (
        MIGRATIONS_DIR / "20260402193000_storage_namespace_metadata_foundation.sql"
    ).read_text(encoding="utf-8")
    normalized = " ".join(text.split())

    assert "ALTER TABLE public.storage_upload_reservations ADD COLUMN storage_surface TEXT" in normalized
    assert "ALTER TABLE public.storage_upload_reservations ADD COLUMN storage_service_slug TEXT" in normalized
    assert "ALTER TABLE public.storage_objects ADD COLUMN storage_surface TEXT" in normalized
    assert "ALTER TABLE public.storage_objects ADD COLUMN storage_service_slug TEXT" in normalized
    assert "ALTER TABLE public.storage_objects ADD COLUMN doc_title TEXT" in normalized
    assert "ALTER TABLE public.storage_objects ADD COLUMN source_type TEXT" in normalized
    assert "ALTER TABLE public.source_documents ADD COLUMN document_surface TEXT" in normalized
    assert "ALTER TABLE public.source_documents ADD COLUMN storage_object_id UUID" in normalized
    assert "p_storage_surface TEXT DEFAULT NULL" in normalized
    assert "p_storage_service_slug TEXT DEFAULT NULL" in normalized


def test_pipeline_source_registry_migration_adds_pipeline_sources_and_fk_columns():
    text = (
        MIGRATIONS_DIR / "20260402194000_pipeline_source_registry_and_fk_migration.sql"
    ).read_text(encoding="utf-8")
    normalized = " ".join(text.split())

    assert "CREATE TABLE public.pipeline_sources" in normalized
    assert "pipeline_source_id UUID PRIMARY KEY" in normalized
    assert "storage_object_id UUID NOT NULL REFERENCES public.storage_objects(storage_object_id) ON DELETE CASCADE" in normalized
    assert "ALTER TABLE public.pipeline_source_set_items ADD COLUMN pipeline_source_id UUID" in normalized
    assert "ALTER TABLE public.pipeline_jobs ADD COLUMN pipeline_source_id UUID" in normalized
    assert "DROP CONSTRAINT IF EXISTS pipeline_source_set_items_source_uid_fkey" in normalized
    assert "DROP CONSTRAINT IF EXISTS pipeline_jobs_source_uid_fkey" in normalized
