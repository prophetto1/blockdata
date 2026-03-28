from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import hashlib
from pathlib import Path, PurePosixPath

from google.cloud import storage as gcs
from google.cloud.exceptions import NotFound

from app.core.config import get_settings
from app.infra.supabase_client import get_supabase_admin
from app.pipelines.registry import get_pipeline_definition


@dataclass(frozen=True)
class PipelineSourceDocument:
    source_uid: str
    project_id: str | None
    source_type: str
    doc_title: str | None
    bucket: str
    object_key: str
    content_type: str
    byte_size: int


@lru_cache(maxsize=1)
def _gcs_client() -> gcs.Client:
    return gcs.Client()


def load_pipeline_source_markdown(*, owner_id: str, source_uid: str) -> bytes:
    source = _load_owned_source_document(owner_id=owner_id, source_uid=source_uid)
    if source.source_type not in {"md", "markdown"}:
        raise RuntimeError("Source type is not eligible for markdown_index_builder")

    blob = _gcs_client().bucket(source.bucket).blob(source.object_key)
    try:
        return blob.download_as_bytes()
    except NotFound as exc:
        raise RuntimeError("Source markdown object not found in GCS") from exc


def store_pipeline_artifact(
    *,
    job: dict,
    deliverable_kind: str,
    filename: str,
    content_type: str,
    local_path: str | Path,
    metadata_jsonb: dict,
) -> dict:
    settings = get_settings()
    if not settings.gcs_user_storage_bucket:
        raise RuntimeError("GCS_USER_STORAGE_BUCKET is not configured")

    definition = get_pipeline_definition(str(job["pipeline_kind"]))
    if definition is None:
        raise RuntimeError(f"Unknown pipeline kind: {job['pipeline_kind']}")

    path = Path(local_path)
    byte_size = path.stat().st_size
    checksum_sha256 = _sha256_file(path)
    object_key = build_pipeline_artifact_object_key(
        user_id=str(job["owner_id"]),
        project_id=str(job["project_id"]),
        source_uid=str(job["source_uid"]),
        job_id=str(job["job_id"]),
        filename=filename,
        service_slug=str(definition["storage_service_slug"]),
    )

    admin = get_supabase_admin()
    reservation = admin.rpc(
        "reserve_user_storage",
        {
            "p_user_id": job["owner_id"],
            "p_project_id": job["project_id"],
            "p_bucket": settings.gcs_user_storage_bucket,
            "p_object_key": object_key,
            "p_requested_bytes": byte_size,
            "p_content_type": content_type,
            "p_original_filename": filename,
            "p_storage_kind": "pipeline",
            "p_source_uid": job["source_uid"],
            "p_source_type": None,
            "p_doc_title": filename,
        },
    ).execute().data

    reservation_id = reservation["reservation_id"]
    blob = _gcs_client().bucket(settings.gcs_user_storage_bucket).blob(object_key)
    storage_object = None

    try:
        blob.upload_from_filename(str(path), content_type=content_type, timeout=60)
        storage_object = admin.rpc(
            "complete_user_storage_upload",
            {
                "p_reservation_id": reservation_id,
                "p_owner_user_id": job["owner_id"],
                "p_actual_bytes": byte_size,
                "p_checksum_sha256": checksum_sha256,
            },
        ).execute().data

        result = (
            admin.table("pipeline_deliverables")
            .insert(
                {
                    "job_id": job["job_id"],
                    "pipeline_kind": job["pipeline_kind"],
                    "deliverable_kind": deliverable_kind,
                    "storage_object_id": storage_object["storage_object_id"],
                    "filename": filename,
                    "content_type": content_type,
                    "byte_size": byte_size,
                    "checksum_sha256": checksum_sha256,
                    "metadata_jsonb": metadata_jsonb,
                }
            )
            .execute()
            .data
        )
        row = result[0] if isinstance(result, list) else result
        return row
    except Exception:
        _cleanup_failed_artifact_upload(
            admin=admin,
            owner_id=str(job["owner_id"]),
            reservation_id=reservation_id,
            storage_object=storage_object,
            bucket_name=settings.gcs_user_storage_bucket,
            object_key=object_key,
        )
        raise


def build_pipeline_artifact_object_key(
    *,
    user_id: str,
    project_id: str,
    source_uid: str,
    job_id: str,
    filename: str,
    service_slug: str,
) -> str:
    safe_filename = _safe_segment(filename)
    return (
        f"users/{user_id}/pipeline-services/{_safe_segment(service_slug)}/projects/{_safe_segment(project_id)}/"
        f"sources/{_safe_segment(source_uid)}/jobs/{_safe_segment(job_id)}/{safe_filename}"
    )


def _load_owned_source_document(*, owner_id: str, source_uid: str) -> PipelineSourceDocument:
    admin = get_supabase_admin()
    source = (
        admin.table("source_documents")
        .select("source_uid, project_id, source_type, doc_title, source_locator")
        .eq("owner_id", owner_id)
        .eq("source_uid", source_uid)
        .maybe_single()
        .execute()
        .data
    )
    if not source:
        raise RuntimeError("Source document not found")

    locator = source.get("source_locator")
    if not locator:
        raise RuntimeError("Source document is missing source_locator")

    storage_object = (
        admin.table("storage_objects")
        .select("bucket, object_key, content_type, byte_size")
        .eq("owner_user_id", owner_id)
        .eq("object_key", locator)
        .eq("status", "active")
        .maybe_single()
        .execute()
        .data
    )
    if not storage_object:
        raise RuntimeError("Source storage object not found")

    return PipelineSourceDocument(
        source_uid=str(source["source_uid"]),
        project_id=source.get("project_id"),
        source_type=str(source.get("source_type") or ""),
        doc_title=source.get("doc_title"),
        bucket=str(storage_object["bucket"]),
        object_key=str(storage_object["object_key"]),
        content_type=str(storage_object.get("content_type") or "application/octet-stream"),
        byte_size=int(storage_object.get("byte_size") or 0),
    )


def _cleanup_failed_artifact_upload(
    *,
    admin,
    owner_id: str,
    reservation_id: str,
    storage_object: dict | None,
    bucket_name: str,
    object_key: str,
) -> None:
    try:
        if storage_object is not None:
            admin.rpc(
                "delete_user_storage_object",
                {"p_user_id": owner_id, "p_storage_object_id": storage_object["storage_object_id"]},
            ).execute()
        else:
            admin.rpc(
                "cancel_user_storage_reservation",
                {"p_reservation_id": reservation_id, "p_owner_user_id": owner_id},
            ).execute()
    except Exception:
        pass

    try:
        _gcs_client().bucket(bucket_name).blob(object_key).delete()
    except NotFound:
        pass
    except Exception:
        pass


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _safe_segment(value: str) -> str:
    safe = PurePosixPath(value).name
    if safe in {"", ".", ".."}:
        raise RuntimeError("Invalid storage path segment")
    return safe
