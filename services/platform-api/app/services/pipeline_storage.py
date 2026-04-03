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
from app.services import pipeline_source_library


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


@dataclass(frozen=True)
class PipelineSourceMarkdownMember:
    source_uid: str
    project_id: str | None
    source_type: str
    doc_title: str | None
    source_order: int
    bucket: str
    object_key: str
    content_type: str
    byte_size: int
    markdown_bytes: bytes


@lru_cache(maxsize=1)
def _gcs_client() -> gcs.Client:
    return gcs.Client()


def load_pipeline_source_markdown(*, owner_id: str, pipeline_source_id: str) -> bytes:
    source = _load_owned_pipeline_source(owner_id=owner_id, pipeline_source_id=pipeline_source_id)
    if source.source_type not in {"md", "markdown"}:
        raise RuntimeError("Source type is not eligible for markdown_index_builder")

    blob = _gcs_client().bucket(source.bucket).blob(source.object_key)
    try:
        return blob.download_as_bytes()
    except NotFound as exc:
        raise RuntimeError("Source markdown object not found in GCS") from exc


def load_pipeline_source_set_markdown_members(*, owner_id: str, source_set_id: str) -> list[PipelineSourceMarkdownMember]:
    admin = get_supabase_admin()
    rows = (
        admin.table("pipeline_source_set_items")
        .select("pipeline_source_id, source_uid, source_order, doc_title, source_type, byte_size, object_key")
        .eq("owner_id", owner_id)
        .eq("source_set_id", source_set_id)
        .order("source_order", desc=False)
        .execute()
        .data
        or []
    )
    if not rows:
        raise RuntimeError("Source set has no markdown members")

    members: list[PipelineSourceMarkdownMember] = []
    for row in rows:
        pipeline_source_id = row.get("pipeline_source_id")
        if not pipeline_source_id:
            raise RuntimeError("Source set member is missing pipeline_source_id")
        source = _load_owned_pipeline_source(owner_id=owner_id, pipeline_source_id=str(pipeline_source_id))
        if source.source_type not in {"md", "markdown"}:
            raise RuntimeError("Source type is not eligible for markdown_index_builder")
        blob = _gcs_client().bucket(source.bucket).blob(source.object_key)
        try:
            markdown_bytes = blob.download_as_bytes()
        except NotFound as exc:
            raise RuntimeError("Source markdown object not found in GCS") from exc
        members.append(
            PipelineSourceMarkdownMember(
                source_uid=source.source_uid,
                project_id=source.project_id,
                source_type=source.source_type,
                doc_title=row.get("doc_title") or source.doc_title,
                source_order=int(row.get("source_order") or len(members) + 1),
                bucket=source.bucket,
                object_key=source.object_key,
                content_type=source.content_type,
                byte_size=int(row.get("byte_size") or source.byte_size),
                markdown_bytes=markdown_bytes,
            )
        )
    return members


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


def _load_owned_pipeline_source(*, owner_id: str, pipeline_source_id: str) -> PipelineSourceDocument:
    admin = get_supabase_admin()
    source = pipeline_source_library.get_owned_pipeline_source(
        admin,
        owner_id=owner_id,
        pipeline_source_id=pipeline_source_id,
    )
    if not source:
        raise RuntimeError("Pipeline source not found")

    return PipelineSourceDocument(
        source_uid=str(source["source_uid"]),
        project_id=source.get("project_id"),
        source_type=str(source.get("source_type") or ""),
        doc_title=source.get("doc_title"),
        bucket=str(source["bucket"]),
        object_key=str(source["object_key"]),
        content_type=str(source.get("content_type") or "application/octet-stream"),
        byte_size=int(source.get("byte_size") or 0),
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
