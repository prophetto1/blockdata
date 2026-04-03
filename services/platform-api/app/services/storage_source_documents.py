from __future__ import annotations


def upsert_source_document_for_storage_object(
    supabase_admin,
    *,
    owner_id: str,
    project_id: str | None,
    source_uid: str,
    source_type: str,
    doc_title: str,
    object_key: str,
    bytes_used: int,
    document_surface: str,
    storage_object_id: str,
) -> None:
    payload = {
        "source_uid": source_uid,
        "owner_id": owner_id,
        "project_id": project_id,
        "source_type": source_type,
        "source_filesize": bytes_used,
        "source_total_characters": None,
        "source_locator": object_key,
        "doc_title": doc_title,
        "status": "uploaded",
        "conversion_job_id": None,
        "error": None,
        "document_surface": document_surface,
        "storage_object_id": storage_object_id,
    }

    supabase_admin.table("source_documents").upsert(payload, on_conflict="source_uid").execute()
