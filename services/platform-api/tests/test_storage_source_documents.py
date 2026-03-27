from __future__ import annotations

from app.services.storage_source_documents import upsert_source_document_for_storage_object


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
        storage_object_id="obj-1",
        object_key="users/user-1/projects/project-1/sources/abc123/source/outline.pdf",
        bytes_used=1234,
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
    }
