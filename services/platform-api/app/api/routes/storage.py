from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import PurePosixPath
from time import perf_counter
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from google.cloud import storage as gcs
from google.cloud.exceptions import NotFound
from pydantic import BaseModel, Field

from app.auth.dependencies import require_user_auth
from app.core.config import get_settings
from app.infra.supabase_client import get_supabase_admin
from app.observability.storage_metrics import (
    record_storage_download_sign,
    record_storage_object_delete,
    record_storage_quota_read,
    record_storage_upload_cancel,
    record_storage_upload_complete,
    record_storage_upload_reserve,
    storage_tracer,
)
from app.services.storage_namespaces import (
    StorageSurface,
    get_pipeline_kind_for_service_slug,
    is_assets_surface,
    is_pipeline_services_surface,
    normalize_storage_namespace,
)
from app.services.storage_source_documents import upsert_source_document_for_storage_object

StorageKind = Literal["source", "converted", "parsed", "export"]

SIGNED_URL_MINUTES = 30
router = APIRouter(prefix="/storage", tags=["storage"])
logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _gcs_client() -> gcs.Client:
    return gcs.Client()


def _safe_object_name(value: str | None) -> str:
    safe = PurePosixPath(value or "").name
    if safe in {"", ".", ".."}:
        return "file"
    return safe


def _safe_path_segment(value: str | None, *, field_name: str) -> str:
    safe = PurePosixPath(value or "").name
    if safe in {"", ".", ".."}:
        raise ValueError(f"{field_name} is required")
    return safe


def build_object_key(
    *,
    user_id: str,
    project_id: str,
    filename: str,
    storage_kind: StorageKind,
    source_uid: str | None = None,
    upload_id: str | None = None,
    artifact_name: str | None = None,
    storage_surface: StorageSurface | None = None,
    storage_service_slug: str | None = None,
) -> str:
    safe_filename = _safe_object_name(filename)
    safe_project_id = _safe_path_segment(project_id, field_name="project_id")

    if storage_kind == "source":
        safe_source_uid = _safe_path_segment(source_uid, field_name="source_uid")
        artifact = _safe_object_name(artifact_name or safe_filename)
        surface = storage_surface or "assets"
        if surface == "assets":
            return (
                f"users/{user_id}/assets/projects/{safe_project_id}/sources/{safe_source_uid}/"
                f"{storage_kind}/{artifact}"
            )
        safe_service_slug = _safe_path_segment(storage_service_slug, field_name="storage_service_slug")
        return (
            f"users/{user_id}/pipeline-services/{safe_service_slug}/projects/{safe_project_id}/"
            f"sources/{safe_source_uid}/{storage_kind}/{artifact}"
        )

    if storage_kind in {"converted", "parsed"}:
        safe_source_uid = _safe_path_segment(source_uid, field_name="source_uid")
        artifact = _safe_object_name(artifact_name or safe_filename)
        return (
            f"users/{user_id}/projects/{safe_project_id}/sources/{safe_source_uid}/"
            f"{storage_kind}/{artifact}"
        )

    safe_upload_id = _safe_path_segment(upload_id, field_name="upload_id")
    return f"users/{user_id}/projects/{safe_project_id}/exports/{safe_upload_id}/{safe_filename}"


def enforce_per_file_limit(size_bytes: int, max_bytes: int) -> None:
    if size_bytes > max_bytes:
        raise ValueError("file too large")


def create_signed_upload_url(bucket_name: str, object_key: str, content_type: str) -> str:
    bucket = _gcs_client().bucket(bucket_name)
    blob = bucket.blob(object_key)
    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=SIGNED_URL_MINUTES),
        method="PUT",
        content_type=content_type,
    )


def create_signed_download_url(*, bucket_name: str, object_key: str) -> str:
    bucket = _gcs_client().bucket(bucket_name)
    blob = bucket.blob(object_key)
    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=SIGNED_URL_MINUTES),
        method="GET",
    )


def get_object_size_bytes(bucket_name: str, object_key: str) -> int | None:
    bucket = _gcs_client().bucket(bucket_name)
    blob = bucket.blob(object_key)
    try:
        blob.reload(timeout=10)
        return int(blob.size or 0)
    except NotFound:
        return None


def delete_object_if_exists(bucket_name: str, object_key: str) -> None:
    blob = _gcs_client().bucket(bucket_name).blob(object_key)
    try:
        blob.delete()
    except NotFound:
        return


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _is_reservation_expired(reservation: dict) -> bool:
    raw_expires = reservation.get("expires_at")
    if raw_expires is None:
        return False

    parsed = _parse_iso_datetime(raw_expires)
    if parsed is None:
        return True

    return parsed <= datetime.now(timezone.utc)


def _http_from_supabase_error(exc: Exception) -> HTTPException:
    msg = str(exc).lower()

    if "storage quota exceeded" in msg:
        return HTTPException(status_code=402, detail="Storage quota exceeded")
    if "project does not belong to user" in msg:
        return HTTPException(status_code=403, detail="Project ownership mismatch")
    if "pending reservation already exists" in msg or "object already exists" in msg:
        return HTTPException(status_code=409, detail="Duplicate pending reservation")
    if "reservation not found" in msg:
        return HTTPException(status_code=404, detail="Reservation not found")
    if "reservation expired" in msg:
        return HTTPException(status_code=410, detail="Reservation expired")
    if "reservation already" in msg:
        return HTTPException(status_code=409, detail="Reservation cannot be completed in current state")
    if "actual bytes cannot exceed reserved bytes" in msg or "cannot exceed reserved bytes" in msg:
        return HTTPException(status_code=413, detail="Uploaded object exceeds reserved bytes")
    if "object row missing" in msg or "object not found" in msg:
        return HTTPException(status_code=404, detail="Object not found")
    if "reserved bytes underflow" in msg:
        return HTTPException(status_code=409, detail="Reservation accounting mismatch")
    return HTTPException(status_code=500, detail="Storage control plane error")


def _http_status_code(exc: Exception) -> int:
    if isinstance(exc, HTTPException):
        return exc.status_code
    return 500


def _fetch_reservation(admin, owner_user_id: str, reservation_id: str) -> dict | None:
    res = (
        admin.table("storage_upload_reservations")
        .select("*")
        .eq("reservation_id", reservation_id)
        .eq("owner_user_id", owner_user_id)
        .maybe_single()
        .execute()
    )
    return res.data


def _fetch_storage_object_by_reservation(admin, owner_user_id: str, reservation_id: str) -> dict | None:
    res = (
        admin.table("storage_objects")
        .select("*")
        .eq("owner_user_id", owner_user_id)
        .eq("reservation_id", reservation_id)
        .maybe_single()
        .execute()
    )
    return res.data


def _fetch_owned_active_storage_object(admin, owner_user_id: str, object_key: str) -> dict | None:
    res = (
        admin.table("storage_objects")
        .select("storage_object_id, bucket, object_key, status")
        .eq("owner_user_id", owner_user_id)
        .eq("object_key", object_key)
        .eq("status", "active")
        .maybe_single()
        .execute()
    )
    return res.data


def _fetch_pending_reservation_by_object(
    admin,
    *,
    owner_user_id: str,
    bucket: str,
    object_key: str,
) -> dict | None:
    res = (
        admin.table("storage_upload_reservations")
        .select("*")
        .eq("owner_user_id", owner_user_id)
        .eq("bucket", bucket)
        .eq("object_key", object_key)
        .eq("status", "pending")
        .maybe_single()
        .execute()
    )
    return res.data


def _pending_reservation_conflict_http_error(existing: dict) -> HTTPException:
    return HTTPException(
        status_code=409,
        detail={
            "code": "pending_reservation_exists",
            "reservation_id": existing.get("reservation_id"),
            "object_key": existing.get("object_key"),
            "requested_bytes": existing.get("requested_bytes"),
            "created_at": existing.get("created_at"),
            "expires_at": existing.get("expires_at"),
        },
    )


def _reserve_upload_with_duplicate_recovery(
    admin,
    *,
    owner_user_id: str,
    project_id: str,
    bucket: str,
    object_key: str,
    requested_bytes: int,
    content_type: str,
    original_filename: str,
    storage_kind: str,
    source_uid: str | None,
    source_type: str | None,
    doc_title: str | None,
    storage_surface: str | None,
    storage_service_slug: str | None,
) -> tuple[dict, bool]:
    payload = {
        "p_user_id": owner_user_id,
        "p_project_id": project_id,
        "p_bucket": bucket,
        "p_object_key": object_key,
        "p_requested_bytes": requested_bytes,
        "p_content_type": content_type,
        "p_original_filename": original_filename,
        "p_storage_kind": storage_kind,
        "p_source_uid": source_uid,
        "p_source_type": source_type,
        "p_doc_title": doc_title,
        "p_storage_surface": storage_surface,
        "p_storage_service_slug": storage_service_slug,
    }

    for _attempt in range(2):
        try:
            return admin.rpc("reserve_user_storage", payload).execute().data, True
        except Exception as exc:
            http_exc = _http_from_supabase_error(exc)
            if http_exc.status_code != 409 or http_exc.detail != "Duplicate pending reservation":
                raise http_exc from exc

            existing = _fetch_pending_reservation_by_object(
                admin,
                owner_user_id=owner_user_id,
                bucket=bucket,
                object_key=object_key,
            )
            if not existing:
                raise http_exc from exc

            if _is_reservation_expired(existing):
                try:
                    admin.rpc(
                        "cancel_user_storage_reservation",
                        {
                            "p_reservation_id": existing["reservation_id"],
                            "p_owner_user_id": owner_user_id,
                        },
                    ).execute()
                except Exception:
                    pass
                continue

            raise _pending_reservation_conflict_http_error(existing) from exc

    raise HTTPException(status_code=409, detail="Duplicate pending reservation")


def _bridge_failure_http_error() -> HTTPException:
    return HTTPException(
        status_code=503,
        detail="Upload completed but source document finalization failed; retry completion",
    )


def _update_storage_object_namespace_metadata(
    admin,
    *,
    storage_object_id: str,
    reservation: dict,
) -> None:
    payload = {
        "storage_surface": reservation.get("storage_surface") or "assets",
        "storage_service_slug": reservation.get("storage_service_slug"),
        "doc_title": reservation.get("doc_title") or reservation.get("original_filename") or "file",
        "source_type": reservation.get("source_type") or "binary",
    }
    admin.table("storage_objects").update(payload).eq("storage_object_id", storage_object_id).execute()


def _sync_source_document_bridge(
    admin,
    *,
    owner_id: str,
    reservation: dict,
    storage_object: dict,
) -> None:
    if reservation.get("storage_kind") != "source" or not is_assets_surface(reservation.get("storage_surface")):
        return

    source_uid = reservation.get("source_uid")
    if not source_uid:
        raise RuntimeError("source reservation missing source_uid")

    upsert_source_document_for_storage_object(
        admin,
        owner_id=owner_id,
        project_id=reservation.get("project_id"),
        source_uid=source_uid,
        source_type=reservation.get("source_type") or "binary",
        doc_title=reservation.get("doc_title") or reservation.get("original_filename") or "file",
        object_key=storage_object["object_key"],
        bytes_used=storage_object["byte_size"],
        document_surface="assets",
        storage_object_id=storage_object["storage_object_id"],
    )


def _sync_pipeline_source_registry(
    admin,
    *,
    owner_id: str,
    reservation: dict,
    storage_object: dict,
) -> None:
    if reservation.get("storage_kind") != "source" or not is_pipeline_services_surface(
        reservation.get("storage_surface")
    ):
        return

    storage_service_slug = reservation.get("storage_service_slug")
    pipeline_kind = get_pipeline_kind_for_service_slug(storage_service_slug)
    if not pipeline_kind:
        raise RuntimeError("pipeline source reservation missing recognized storage_service_slug")

    payload = {
        "owner_id": owner_id,
        "project_id": reservation.get("project_id"),
        "pipeline_kind": pipeline_kind,
        "storage_service_slug": storage_service_slug,
        "storage_object_id": storage_object["storage_object_id"],
        "source_uid": reservation.get("source_uid"),
        "doc_title": reservation.get("doc_title") or reservation.get("original_filename") or "file",
        "source_type": reservation.get("source_type") or "binary",
        "byte_size": storage_object.get("byte_size"),
        "object_key": storage_object["object_key"],
    }
    admin.table("pipeline_sources").upsert(
        payload,
        on_conflict="owner_id,project_id,pipeline_kind,source_uid",
    ).execute()


def _delete_assets_document_metadata(admin, *, owner_id: str, storage_object: dict) -> None:
    table = admin.table("source_documents")
    storage_object_id = storage_object.get("storage_object_id")
    if storage_object_id:
        result = (
            table.delete()
            .eq("owner_id", owner_id)
            .eq("storage_object_id", storage_object_id)
            .execute()
        )
        if result.data:
            return

    source_uid = storage_object.get("source_uid")
    if not source_uid:
        return

    query = (
        admin.table("source_documents")
        .delete()
        .eq("owner_id", owner_id)
        .eq("source_uid", source_uid)
        .eq("document_surface", "assets")
    )
    project_id = storage_object.get("project_id")
    if project_id is not None:
        query = query.eq("project_id", project_id)
    query.execute()


def _delete_pipeline_source_metadata(admin, *, owner_id: str, storage_object: dict) -> None:
    table = admin.table("pipeline_sources")
    storage_object_id = storage_object.get("storage_object_id")
    if storage_object_id:
        result = (
            table.delete()
            .eq("owner_id", owner_id)
            .eq("storage_object_id", storage_object_id)
            .execute()
        )
        if result.data:
            return

    source_uid = storage_object.get("source_uid")
    if not source_uid:
        return

    query = (
        admin.table("pipeline_sources")
        .delete()
        .eq("owner_id", owner_id)
        .eq("source_uid", source_uid)
    )
    project_id = storage_object.get("project_id")
    if project_id is not None:
        query = query.eq("project_id", project_id)
    storage_service_slug = storage_object.get("storage_service_slug")
    if storage_service_slug:
        query = query.eq("storage_service_slug", storage_service_slug)
    query.execute()


def _reconcile_deleted_storage_metadata(admin, *, owner_id: str, storage_object: dict) -> None:
    if storage_object.get("storage_kind") != "source":
        return

    if is_assets_surface(storage_object.get("storage_surface")):
        _delete_assets_document_metadata(admin, owner_id=owner_id, storage_object=storage_object)
        return

    if is_pipeline_services_surface(storage_object.get("storage_surface")):
        _delete_pipeline_source_metadata(admin, owner_id=owner_id, storage_object=storage_object)


def _assert_project_ownership(admin, user_id: str, project_id: str) -> None:
    res = (
        admin.table("user_projects")
        .select("owner_id")
        .eq("project_id", project_id)
        .limit(1)
        .execute()
    )
    row = res.data[0] if res.data else None
    if not row or row.get("owner_id") != user_id:
        raise HTTPException(status_code=403, detail="Project ownership mismatch")


class CreateUploadRequest(BaseModel):
    project_id: str = Field(min_length=1)
    filename: str = Field(min_length=1)
    content_type: str = Field(min_length=1)
    expected_bytes: int = Field(ge=0)
    storage_kind: StorageKind = "source"
    source_uid: str | None = None
    source_type: str | None = None
    doc_title: str | None = None
    artifact_name: str | None = None
    storage_surface: StorageSurface | None = None
    storage_service_slug: str | None = None


class CompleteUploadRequest(BaseModel):
    actual_bytes: int | None = Field(default=None, ge=0)
    checksum_sha256: str | None = None


class CreateDownloadUrlRequest(BaseModel):
    object_key: str = Field(min_length=1)


@router.get("/quota")
async def read_storage_quota(auth=Depends(require_user_auth)):
    started = perf_counter()
    with storage_tracer.start_as_current_span("storage.quota.read"):
        admin = get_supabase_admin()
        try:
            result = (
                admin.table("storage_quotas")
                .select("*")
                .eq("user_id", auth.user_id)
                .maybe_single()
                .execute()
            )
            if not result.data:
                raise HTTPException(status_code=404, detail="Quota not provisioned")
            record_storage_quota_read(
                result="ok",
                quota_bytes=result.data.get("quota_bytes"),
                used_bytes=result.data.get("used_bytes"),
                reserved_bytes=result.data.get("reserved_bytes"),
                http_status_code=200,
            )
            return result.data
        except Exception as exc:
            record_storage_quota_read(
                result="error",
                quota_bytes=None,
                used_bytes=None,
                reserved_bytes=None,
                http_status_code=_http_status_code(exc),
            )
            raise


@router.post("/download-url")
async def create_download_url(body: CreateDownloadUrlRequest, auth=Depends(require_user_auth)):
    started = perf_counter()
    with storage_tracer.start_as_current_span("storage.download.sign_url") as span:
        span.set_attribute("storage.kind", "gcs")
        span.set_attribute("has_object", False)
        admin = get_supabase_admin()
        storage_object = None
        try:
            storage_object = _fetch_owned_active_storage_object(admin, auth.user_id, body.object_key)
            if not storage_object:
                http_exc = HTTPException(status_code=404, detail="Object not found")
                span.set_attribute("result", "error")
                span.set_attribute("http.status_code", http_exc.status_code)
                record_storage_download_sign(
                    result="error",
                    storage_kind="gcs",
                    http_status_code=http_exc.status_code,
                    has_object=False,
                    duration_ms=(perf_counter() - started) * 1000.0,
                )
                raise http_exc

            span.set_attribute("has_object", True)
            signed_url = create_signed_download_url(
                bucket_name=storage_object["bucket"],
                object_key=storage_object["object_key"],
            )
        except HTTPException:
            raise
        except Exception as exc:
            http_exc = _http_from_supabase_error(exc)
            span.set_attribute("result", "error")
            span.set_attribute("http.status_code", http_exc.status_code)
            record_storage_download_sign(
                result="error",
                storage_kind="gcs",
                http_status_code=http_exc.status_code,
                has_object=bool(storage_object),
                duration_ms=(perf_counter() - started) * 1000.0,
            )
            raise http_exc from exc

        span.set_attribute("result", "ok")
        span.set_attribute("http.status_code", 200)
        record_storage_download_sign(
            result="ok",
            storage_kind="gcs",
            http_status_code=200,
            has_object=True,
            duration_ms=(perf_counter() - started) * 1000.0,
        )
        return {
            "signed_url": signed_url,
            "expires_in_seconds": SIGNED_URL_MINUTES * 60,
        }


@router.post("/uploads")
async def create_upload(body: CreateUploadRequest, auth=Depends(require_user_auth)):
    started = perf_counter()
    with storage_tracer.start_as_current_span("storage.upload.reserve") as span:
        span.set_attribute("storage.kind", body.storage_kind)
        span.set_attribute("requested.bytes", body.expected_bytes)
        span.set_attribute("has_project_id", bool(body.project_id))

        settings = get_settings()
        if not settings.gcs_user_storage_bucket:
            exc = HTTPException(status_code=500, detail="GCS_USER_STORAGE_BUCKET is not configured")
            record_storage_upload_reserve(
                result="error",
                storage_kind=body.storage_kind,
                requested_bytes=body.expected_bytes,
                has_project_id=bool(body.project_id),
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=exc.status_code,
            )
            raise exc

        try:
            enforce_per_file_limit(body.expected_bytes, settings.user_storage_max_file_bytes)
        except ValueError as exc:
            http_exc = HTTPException(status_code=413, detail=str(exc))
            record_storage_upload_reserve(
                result="error",
                storage_kind=body.storage_kind,
                requested_bytes=body.expected_bytes,
                has_project_id=bool(body.project_id),
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=http_exc.status_code,
            )
            raise http_exc from exc

        admin = get_supabase_admin()
        _assert_project_ownership(admin, auth.user_id, body.project_id)

        upload_id = uuid4().hex
        try:
            storage_surface, storage_service_slug = normalize_storage_namespace(
                storage_surface=body.storage_surface if body.storage_kind == "source" else None,
                storage_service_slug=body.storage_service_slug if body.storage_kind == "source" else None,
            )
            object_key = build_object_key(
                user_id=auth.user_id,
                project_id=body.project_id,
                filename=body.filename,
                storage_kind=body.storage_kind,
                source_uid=body.source_uid,
                upload_id=upload_id,
                artifact_name=body.artifact_name,
                storage_surface=storage_surface if body.storage_kind == "source" else None,
                storage_service_slug=storage_service_slug if body.storage_kind == "source" else None,
            )
        except ValueError as exc:
            http_exc = HTTPException(status_code=422, detail=str(exc))
            record_storage_upload_reserve(
                result="error",
                storage_kind=body.storage_kind,
                requested_bytes=body.expected_bytes,
                has_project_id=bool(body.project_id),
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=http_exc.status_code,
            )
            raise http_exc from exc

        try:
            reservation, created_new_reservation = _reserve_upload_with_duplicate_recovery(
                admin,
                owner_user_id=auth.user_id,
                project_id=body.project_id,
                bucket=settings.gcs_user_storage_bucket,
                object_key=object_key,
                requested_bytes=body.expected_bytes,
                content_type=body.content_type,
                original_filename=body.filename,
                storage_kind=body.storage_kind,
                source_uid=body.source_uid,
                source_type=body.source_type,
                doc_title=body.doc_title,
                storage_surface=storage_surface if body.storage_kind == "source" else None,
                storage_service_slug=storage_service_slug if body.storage_kind == "source" else None,
            )
        except HTTPException as http_exc:
            record_storage_upload_reserve(
                result="error",
                storage_kind=body.storage_kind,
                requested_bytes=body.expected_bytes,
                has_project_id=bool(body.project_id),
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=http_exc.status_code,
            )
            raise

        try:
            with storage_tracer.start_as_current_span("storage.upload.sign_url"):
                signed_upload_url = create_signed_upload_url(
                    bucket_name=settings.gcs_user_storage_bucket,
                    object_key=object_key,
                    content_type=body.content_type,
                )
        except Exception as exc:
            if created_new_reservation:
                try:
                    admin.rpc(
                        "cancel_user_storage_reservation",
                        {"p_reservation_id": reservation["reservation_id"], "p_owner_user_id": auth.user_id},
                    ).execute()
                except Exception:
                    pass
            http_exc = HTTPException(status_code=502, detail="Failed to create signed upload URL")
            record_storage_upload_reserve(
                result="error",
                storage_kind=body.storage_kind,
                requested_bytes=body.expected_bytes,
                has_project_id=bool(body.project_id),
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=http_exc.status_code,
            )
            raise http_exc from exc

        record_storage_upload_reserve(
            result="ok",
            storage_kind=body.storage_kind,
            requested_bytes=body.expected_bytes,
            has_project_id=bool(body.project_id),
            duration_ms=(perf_counter() - started) * 1000.0,
            http_status_code=200,
        )
        return {
            "reservation_id": reservation["reservation_id"],
            "bucket": reservation["bucket"],
            "object_key": reservation["object_key"],
            "requested_bytes": reservation["requested_bytes"],
            "status": reservation["status"],
            "signed_upload_url": signed_upload_url,
            "expires_in_seconds": SIGNED_URL_MINUTES * 60,
        }


@router.post("/uploads/{reservation_id}/complete")
async def finalize_upload(
    reservation_id: str,
    body: CompleteUploadRequest,
    auth=Depends(require_user_auth),
):
    started = perf_counter()
    with storage_tracer.start_as_current_span("storage.upload.complete"):
        admin = get_supabase_admin()
        reservation = _fetch_reservation(admin, auth.user_id, reservation_id)
        if not reservation:
            http_exc = HTTPException(status_code=404, detail="Reservation not found")
            record_storage_upload_complete(
                result="error",
                storage_kind="unknown",
                actual_bytes=body.actual_bytes,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=http_exc.status_code,
            )
            raise http_exc

        storage_kind = reservation.get("storage_kind", "unknown")
        status = reservation.get("status")
        if status == "completed":
            existing = _fetch_storage_object_by_reservation(admin, auth.user_id, reservation_id)
            if not existing:
                http_exc = HTTPException(status_code=409, detail="Reservation completed but object row is missing")
                record_storage_upload_complete(
                    result="error",
                    storage_kind=storage_kind,
                    actual_bytes=body.actual_bytes,
                    duration_ms=(perf_counter() - started) * 1000.0,
                    http_status_code=http_exc.status_code,
                )
                raise http_exc
            try:
                _sync_source_document_bridge(
                    admin,
                    owner_id=auth.user_id,
                    reservation=reservation,
                    storage_object=existing,
                )
            except Exception as exc:
                logger.exception("storage.source_document_bridge_repair_failed")
                http_exc = _bridge_failure_http_error()
                record_storage_upload_complete(
                    result="error",
                    storage_kind=storage_kind,
                    actual_bytes=existing.get("byte_size"),
                    duration_ms=(perf_counter() - started) * 1000.0,
                    http_status_code=http_exc.status_code,
                )
                raise http_exc from exc
            record_storage_upload_complete(
                result="ok",
                storage_kind=storage_kind,
                actual_bytes=existing.get("byte_size"),
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=200,
            )
            return existing

        if status != "pending":
            http_exc = HTTPException(status_code=409, detail=f"Cannot complete reservation in '{status}' state")
            record_storage_upload_complete(
                result="error",
                storage_kind=storage_kind,
                actual_bytes=body.actual_bytes,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=http_exc.status_code,
            )
            raise http_exc

        if _is_reservation_expired(reservation):
            http_exc = HTTPException(status_code=410, detail="Reservation expired")
            record_storage_upload_complete(
                result="error",
                storage_kind=storage_kind,
                actual_bytes=body.actual_bytes,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=http_exc.status_code,
            )
            raise http_exc

        uploaded_size = get_object_size_bytes(reservation["bucket"], reservation["object_key"])
        if uploaded_size is None:
            http_exc = HTTPException(status_code=410, detail="Uploaded object not found in GCS")
            record_storage_upload_complete(
                result="error",
                storage_kind=storage_kind,
                actual_bytes=body.actual_bytes,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=http_exc.status_code,
            )
            raise http_exc

        if uploaded_size > reservation["requested_bytes"]:
            try:
                admin.rpc(
                    "cancel_user_storage_reservation",
                    {"p_reservation_id": reservation_id, "p_owner_user_id": auth.user_id},
                ).execute()
            except Exception:
                pass
            http_exc = HTTPException(status_code=413, detail="Uploaded object exceeds reserved bytes")
            record_storage_upload_complete(
                result="error",
                storage_kind=storage_kind,
                actual_bytes=uploaded_size,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=http_exc.status_code,
            )
            raise http_exc

        if body.actual_bytes is not None and body.actual_bytes != uploaded_size:
            http_exc = HTTPException(status_code=409, detail="actual_bytes must match observed uploaded size")
            record_storage_upload_complete(
                result="error",
                storage_kind=storage_kind,
                actual_bytes=uploaded_size,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=http_exc.status_code,
            )
            raise http_exc

        try:
            result = admin.rpc(
                "complete_user_storage_upload",
                {
                    "p_reservation_id": reservation_id,
                    "p_owner_user_id": auth.user_id,
                    "p_actual_bytes": uploaded_size,
                    "p_checksum_sha256": body.checksum_sha256,
                },
            ).execute().data
        except Exception as exc:
            http_exc = _http_from_supabase_error(exc)
            record_storage_upload_complete(
                result="error",
                storage_kind=storage_kind,
                actual_bytes=uploaded_size,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=http_exc.status_code,
            )
            raise http_exc from exc

        try:
            _update_storage_object_namespace_metadata(
                admin,
                storage_object_id=result["storage_object_id"],
                reservation=reservation,
            )
            _sync_source_document_bridge(
                admin,
                owner_id=auth.user_id,
                reservation=reservation,
                storage_object=result,
            )
            _sync_pipeline_source_registry(
                admin,
                owner_id=auth.user_id,
                reservation=reservation,
                storage_object=result,
            )
        except Exception as exc:
            logger.exception("storage.source_document_bridge_finalization_failed")
            http_exc = _bridge_failure_http_error()
            record_storage_upload_complete(
                result="error",
                storage_kind=storage_kind,
                actual_bytes=uploaded_size,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=http_exc.status_code,
            )
            raise http_exc from exc

        record_storage_upload_complete(
            result="ok",
            storage_kind=storage_kind,
            actual_bytes=uploaded_size,
            duration_ms=(perf_counter() - started) * 1000.0,
            http_status_code=200,
        )
        return result


@router.delete("/uploads/{reservation_id}", status_code=204)
async def cancel_upload(reservation_id: str, auth=Depends(require_user_auth)):
    admin = get_supabase_admin()
    try:
        admin.rpc(
            "cancel_user_storage_reservation",
            {"p_reservation_id": reservation_id, "p_owner_user_id": auth.user_id},
        ).execute()
    except Exception as exc:
        record_storage_upload_cancel(result="error", http_status_code=_http_status_code(_http_from_supabase_error(exc)))
        raise _http_from_supabase_error(exc) from exc
    record_storage_upload_cancel(result="ok", http_status_code=204)
    return Response(status_code=204)


@router.delete("/objects/{storage_object_id}", status_code=204)
async def delete_storage_object(storage_object_id: str, auth=Depends(require_user_auth)):
    admin = get_supabase_admin()
    try:
        deleted = (
            admin.rpc(
                "delete_user_storage_object",
                {"p_user_id": auth.user_id, "p_storage_object_id": storage_object_id},
            )
            .execute()
            .data
        )
    except Exception as exc:
        record_storage_object_delete(
            result="error",
            storage_kind=None,
            actual_bytes=None,
            http_status_code=_http_status_code(_http_from_supabase_error(exc)),
        )
        raise _http_from_supabase_error(exc) from exc

    if not deleted:
        record_storage_object_delete(
            result="error",
            storage_kind=None,
            actual_bytes=None,
            http_status_code=404,
        )
        raise HTTPException(status_code=404, detail="Object not found")

    try:
        _reconcile_deleted_storage_metadata(admin, owner_id=auth.user_id, storage_object=deleted)
    except Exception:
        logger.exception("storage.delete_metadata_reconciliation_failed")

    try:
        if deleted.get("status") == "deleted" and deleted.get("bucket") and deleted.get("object_key"):
            delete_object_if_exists(deleted["bucket"], deleted["object_key"])
    except Exception:
        pass

    record_storage_object_delete(
        result="ok",
        storage_kind=deleted.get("storage_kind"),
        actual_bytes=deleted.get("byte_size"),
        http_status_code=204,
    )
    return Response(status_code=204)


@router.post("/quota/reconcile")
async def reconcile_quota(auth=Depends(require_user_auth)):
    admin = get_supabase_admin()
    try:
        return admin.rpc("reconcile_user_storage_usage", {"p_user_id": auth.user_id}).execute().data
    except Exception as exc:
        raise _http_from_supabase_error(exc) from exc
