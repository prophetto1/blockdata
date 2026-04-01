from __future__ import annotations

import time
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException
from opentelemetry import metrics, trace

from app.core.config import get_settings
from app.domain.agchain.inspect_dataset_materializer import (
    preview_dataset_draft as preview_dataset_draft_materializer,
    preview_dataset_source as preview_dataset_source_materializer,
)
from app.domain.agchain.operation_queue import create_operation
from app.domain.agchain.project_access import require_project_access, require_project_write_access
from app.infra.supabase_client import get_supabase_admin


ALLOWED_SOURCE_TYPES = ["csv", "json", "jsonl", "huggingface"]
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

dataset_draft_create_duration_ms = meter.create_histogram("agchain.inspect.dataset.draft.create.duration_ms")
dataset_draft_update_duration_ms = meter.create_histogram("agchain.inspect.dataset.draft.update.duration_ms")


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _page_offset(*, cursor: str | None, offset: int) -> int:
    if cursor is None:
        return offset
    try:
        return max(0, int(cursor))
    except ValueError:
        return offset


def _next_cursor(*, start: int, limit: int, total: int) -> str | None:
    next_offset = start + limit
    return str(next_offset) if next_offset < total else None


def _latest_validations_by_version(*, sb, dataset_version_ids: list[str]) -> dict[str, dict[str, Any]]:
    if not dataset_version_ids:
        return {}
    rows = (
        sb.table("agchain_dataset_version_validations")
        .select("*")
        .in_("dataset_version_id", dataset_version_ids)
        .order("generated_at", desc=True)
        .execute()
        .data
        or []
    )
    latest: dict[str, dict[str, Any]] = {}
    for row in rows:
        version_id = row.get("dataset_version_id")
        if isinstance(version_id, str) and version_id not in latest:
            latest[version_id] = row
    return latest


def _normalize_version_summary(
    row: dict[str, Any],
    *,
    validation_row: dict[str, Any] | None,
) -> dict[str, Any]:
    return {
        "dataset_version_id": row["dataset_version_id"],
        "version_label": row["version_label"],
        "created_at": row["created_at"],
        "sample_count": int(row.get("sample_count", 0)),
        "checksum": row["checksum"],
        "validation_status": (validation_row or {}).get("validation_status", "unknown"),
        "base_version_id": row.get("base_version_id"),
    }


def _normalize_dataset_detail(
    row: dict[str, Any],
    *,
    latest_version_label: str | None,
    sample_count: int,
    validation_status: str,
) -> dict[str, Any]:
    return {
        "dataset_id": row["dataset_id"],
        "slug": row["slug"],
        "name": row["name"],
        "description": row.get("description") or "",
        "tags": _as_list(row.get("tags_jsonb")),
        "status": row["status"],
        "source_type": row["source_type"],
        "latest_version_id": row.get("latest_version_id"),
        "latest_version_label": latest_version_label,
        "sample_count": sample_count,
        "validation_status": validation_status,
        "updated_at": row["updated_at"],
    }


def _get_dataset_row(*, sb, dataset_id: str, project_id: str | None = None) -> dict[str, Any]:
    query = sb.table("agchain_datasets").select("*").eq("dataset_id", dataset_id)
    if project_id is not None:
        query = query.eq("project_id", project_id)
    row = query.maybe_single().execute().data
    if not row:
        raise HTTPException(status_code=404, detail="AG chain dataset not found")
    return row


def _get_dataset_version_row(*, sb, dataset_id: str, dataset_version_id: str) -> dict[str, Any]:
    row = (
        sb.table("agchain_dataset_versions")
        .select("*")
        .eq("dataset_version_id", dataset_version_id)
        .eq("dataset_id", dataset_id)
        .maybe_single()
        .execute()
        .data
    )
    if not row:
        raise HTTPException(status_code=404, detail="AG chain dataset version not found")
    return row


def _resolve_dataset_project(
    *,
    sb,
    user_id: str,
    dataset_id: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    dataset = _get_dataset_row(sb=sb, dataset_id=dataset_id)
    project = require_project_access(user_id=user_id, project_id=dataset["project_id"], sb=sb)
    return dataset, project


def _resolve_dataset_version_project(
    *,
    sb,
    user_id: str,
    dataset_id: str,
    dataset_version_id: str,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    version = _get_dataset_version_row(sb=sb, dataset_id=dataset_id, dataset_version_id=dataset_version_id)
    dataset, project = _resolve_dataset_project(sb=sb, user_id=user_id, dataset_id=dataset_id)
    return dataset, version, project


def list_datasets(
    *,
    user_id: str,
    project_id: str,
    search: str | None,
    source_type: str | None,
    status: str | None,
    validation_status: str | None,
    limit: int,
    cursor: str | None,
    offset: int,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_project_access(user_id=user_id, project_id=project_id, sb=sb)
    dataset_rows = (
        sb.table("agchain_datasets")
        .select("*")
        .eq("project_id", project_id)
        .order("updated_at", desc=True)
        .execute()
        .data
        or []
    )
    latest_version_ids = [row["latest_version_id"] for row in dataset_rows if row.get("latest_version_id")]
    versions_by_id: dict[str, dict[str, Any]] = {}
    if latest_version_ids:
        version_rows = (
            sb.table("agchain_dataset_versions")
            .select("dataset_version_id, version_label, sample_count, checksum")
            .in_("dataset_version_id", latest_version_ids)
            .execute()
            .data
            or []
        )
        versions_by_id = {row["dataset_version_id"]: row for row in version_rows}
    validations_by_version = _latest_validations_by_version(sb=sb, dataset_version_ids=latest_version_ids)

    items: list[dict[str, Any]] = []
    needle = (search or "").strip().lower()
    for row in dataset_rows:
        latest_version_id = row.get("latest_version_id")
        latest_version = versions_by_id.get(latest_version_id) if latest_version_id else None
        latest_validation = validations_by_version.get(latest_version_id) if latest_version_id else None
        item = {
            "dataset_id": row["dataset_id"],
            "slug": row["slug"],
            "name": row["name"],
            "description": row.get("description") or "",
            "status": row["status"],
            "source_type": row["source_type"],
            "latest_version_id": latest_version_id,
            "latest_version_label": latest_version.get("version_label") if latest_version else None,
            "sample_count": int((latest_version or {}).get("sample_count", 0)),
            "validation_status": (latest_validation or {}).get("validation_status", "unknown"),
            "updated_at": row["updated_at"],
        }
        if needle and not any(needle in (str(item[key]).lower()) for key in ("slug", "name", "description")):
            continue
        if source_type and item["source_type"] != source_type:
            continue
        if status and item["status"] != status:
            continue
        if validation_status and item["validation_status"] != validation_status:
            continue
        items.append(item)

    start = _page_offset(cursor=cursor, offset=offset)
    paged = items[start:start + limit]
    return {
        "items": paged,
        "next_cursor": _next_cursor(start=start, limit=limit, total=len(items)),
    }


def get_dataset_bootstrap(*, user_id: str, project_id: str | None = None) -> dict[str, Any]:
    payload = {
        "allowed_source_types": ALLOWED_SOURCE_TYPES,
        "field_spec_defaults": {
            "input": None,
            "messages": None,
            "choices": None,
            "target": None,
            "id": None,
            "metadata": None,
            "sandbox": None,
            "files": None,
            "setup": None,
        },
        "source_config_defaults": {
            "csv": {"delimiter": ",", "headers": True, "encoding": "utf-8"},
            "json": {"path_hints": []},
            "jsonl": {"line_mode": "jsonl"},
            "huggingface": {"split": "train", "trust": False, "cached": True},
        },
        "materialization_defaults": {
            "shuffle": False,
            "shuffle_choices": False,
            "limit": None,
            "auto_id": True,
            "deterministic_seed": None,
        },
        "upload_limits": {
            "max_bytes": 10485760,
            "accepted_content_types": ["text/csv", "application/json", "application/x-ndjson"],
        },
        "validation_rules": {
            "required_fields": ["input"],
            "optional_fields": ["target", "choices", "metadata", "sandbox", "files", "setup"],
        },
    }
    if project_id is not None:
        project = require_project_access(user_id=user_id, project_id=project_id)
        payload["project_defaults"] = {
            "project_id": project["project_id"],
            "project_slug": project.get("project_slug"),
            "project_name": project.get("project_name"),
        }
    return payload


def get_dataset_detail(
    *,
    user_id: str,
    project_id: str,
    dataset_id: str,
    version_id: str | None,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_project_access(user_id=user_id, project_id=project_id, sb=sb)
    dataset = _get_dataset_row(sb=sb, dataset_id=dataset_id, project_id=project_id)

    version_rows = (
        sb.table("agchain_dataset_versions")
        .select("*")
        .eq("dataset_id", dataset_id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    versions_by_id = {row["dataset_version_id"]: row for row in version_rows}
    selected_version_id = version_id or dataset.get("latest_version_id")
    selected_version_row = versions_by_id.get(selected_version_id) if selected_version_id else None
    validation_rows = _latest_validations_by_version(
        sb=sb,
        dataset_version_ids=[row["dataset_version_id"] for row in version_rows],
    )
    selected_validation = (
        validation_rows.get(selected_version_row["dataset_version_id"]) if selected_version_row else None
    )
    selected_version = (
        _normalize_version_summary(selected_version_row, validation_row=selected_validation)
        if selected_version_row
        else None
    )
    warnings_summary = {
        "warning_count": int((selected_validation or {}).get("warning_count", 0)),
        "duplicate_id_count": int((selected_validation or {}).get("duplicate_id_count", 0)),
        "missing_field_count": int((selected_validation or {}).get("missing_field_count", 0)),
        "unsupported_payload_count": int((selected_validation or {}).get("unsupported_payload_count", 0)),
    }
    tab_counts = {
        "versions": len(version_rows),
        "samples": int((selected_version_row or {}).get("sample_count", 0)),
        "warnings": warnings_summary["warning_count"],
    }
    dataset_detail = _normalize_dataset_detail(
        dataset,
        latest_version_label=(versions_by_id.get(dataset.get("latest_version_id")) or {}).get("version_label"),
        sample_count=int((selected_version_row or {}).get("sample_count", 0)),
        validation_status=(selected_validation or {}).get("validation_status", "unknown"),
    )
    available_actions = ["create_version_draft", "update_metadata"]
    if dataset["status"] == "active":
        available_actions.append("archive")
    else:
        available_actions.append("activate")
    return {
        "dataset": dataset_detail,
        "selected_version": selected_version,
        "tab_counts": tab_counts,
        "warnings_summary": warnings_summary,
        "available_actions": available_actions,
    }


def list_dataset_versions(
    *,
    user_id: str,
    project_id: str,
    dataset_id: str,
    limit: int,
    cursor: str | None,
    offset: int,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_project_access(user_id=user_id, project_id=project_id, sb=sb)
    _get_dataset_row(sb=sb, dataset_id=dataset_id, project_id=project_id)
    version_rows = (
        sb.table("agchain_dataset_versions")
        .select("*")
        .eq("dataset_id", dataset_id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    validations = _latest_validations_by_version(
        sb=sb,
        dataset_version_ids=[row["dataset_version_id"] for row in version_rows],
    )
    items = [
        _normalize_version_summary(row, validation_row=validations.get(row["dataset_version_id"]))
        for row in version_rows
    ]
    start = _page_offset(cursor=cursor, offset=offset)
    return {
        "items": items[start:start + limit],
        "next_cursor": _next_cursor(start=start, limit=limit, total=len(items)),
    }


def get_dataset_version_source(
    *,
    user_id: str,
    dataset_id: str,
    dataset_version_id: str,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    _, row, _ = _resolve_dataset_version_project(
        sb=sb,
        user_id=user_id,
        dataset_id=dataset_id,
        dataset_version_id=dataset_version_id,
    )
    return {
        "dataset_version_id": row["dataset_version_id"],
        "source_type": row["source_type"],
        "source_uri": row.get("source_uri"),
        "source_config_jsonb": _as_dict(row.get("source_config_jsonb")),
    }


def get_dataset_version_mapping(
    *,
    user_id: str,
    dataset_id: str,
    dataset_version_id: str,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    _, row, _ = _resolve_dataset_version_project(
        sb=sb,
        user_id=user_id,
        dataset_id=dataset_id,
        dataset_version_id=dataset_version_id,
    )
    parse_summary = _as_dict(row.get("parse_summary_jsonb"))
    return {
        "dataset_version_id": row["dataset_version_id"],
        "field_spec_jsonb": _as_dict(row.get("field_spec_jsonb")),
        "field_resolution_summary": _as_dict(parse_summary.get("field_resolution_summary")),
    }


def get_dataset_version_validation(
    *,
    user_id: str,
    dataset_id: str,
    dataset_version_id: str,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    _resolve_dataset_version_project(
        sb=sb,
        user_id=user_id,
        dataset_id=dataset_id,
        dataset_version_id=dataset_version_id,
    )
    row = (
        sb.table("agchain_dataset_version_validations")
        .select("*")
        .eq("dataset_version_id", dataset_version_id)
        .order("generated_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
        .data
    )
    if not row:
        return {
            "dataset_version_id": dataset_version_id,
            "validation_status": "unknown",
            "issue_groups": [],
            "warning_counts": {
                "warning_count": 0,
                "duplicate_id_count": 0,
                "missing_field_count": 0,
                "unsupported_payload_count": 0,
            },
            "generated_at": None,
        }
    return {
        "dataset_version_id": dataset_version_id,
        "validation_status": row["validation_status"],
        "issue_groups": _as_list(row.get("issue_groups_jsonb")),
        "warning_counts": {
            "warning_count": int(row.get("warning_count", 0)),
            "duplicate_id_count": int(row.get("duplicate_id_count", 0)),
            "missing_field_count": int(row.get("missing_field_count", 0)),
            "unsupported_payload_count": int(row.get("unsupported_payload_count", 0)),
        },
        "generated_at": row.get("generated_at"),
    }


def list_dataset_samples(
    *,
    user_id: str,
    project_id: str,
    dataset_id: str,
    dataset_version_id: str,
    search: str | None,
    has_setup: bool | None,
    has_sandbox: bool | None,
    has_files: bool | None,
    parse_status: str | None,
    limit: int,
    cursor: str | None,
    offset: int,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    require_project_access(user_id=user_id, project_id=project_id, sb=sb)
    _get_dataset_row(sb=sb, dataset_id=dataset_id, project_id=project_id)
    _get_dataset_version_row(sb=sb, dataset_id=dataset_id, dataset_version_id=dataset_version_id)
    rows = (
        sb.table("agchain_dataset_samples")
        .select("*")
        .eq("dataset_version_id", dataset_version_id)
        .order("sample_id")
        .execute()
        .data
        or []
    )
    needle = (search or "").strip().lower()
    items: list[dict[str, Any]] = []
    for row in rows:
        summary = _as_dict(row.get("summary_jsonb"))
        item = {
            "sample_id": row["sample_id"],
            "input_preview": summary.get("input_preview"),
            "target_preview": summary.get("target_preview"),
            "choice_count": int(summary.get("choice_count", 0)),
            "metadata_summary": _as_dict(summary.get("metadata_summary")),
            "has_setup": bool(row.get("has_setup", False)),
            "has_sandbox": bool(row.get("has_sandbox", False)),
            "has_files": bool(row.get("has_files", False)),
            "parse_status": row.get("parse_status", "ok"),
        }
        haystack = " ".join(
            str(part) for part in (item["sample_id"], item["input_preview"], item["target_preview"]) if part
        ).lower()
        if needle and needle not in haystack:
            continue
        if has_setup is not None and item["has_setup"] is not has_setup:
            continue
        if has_sandbox is not None and item["has_sandbox"] is not has_sandbox:
            continue
        if has_files is not None and item["has_files"] is not has_files:
            continue
        if parse_status and item["parse_status"] != parse_status:
            continue
        items.append(item)

    start = _page_offset(cursor=cursor, offset=offset)
    return {
        "items": items[start:start + limit],
        "next_cursor": _next_cursor(start=start, limit=limit, total=len(items)),
    }


def get_dataset_sample_detail(
    *,
    user_id: str,
    dataset_id: str,
    dataset_version_id: str,
    sample_id: str,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    _resolve_dataset_version_project(
        sb=sb,
        user_id=user_id,
        dataset_id=dataset_id,
        dataset_version_id=dataset_version_id,
    )
    row = (
        sb.table("agchain_dataset_samples")
        .select("*")
        .eq("dataset_version_id", dataset_version_id)
        .eq("sample_id", sample_id)
        .maybe_single()
        .execute()
        .data
    )
    if not row:
        raise HTTPException(status_code=404, detail="AG chain dataset sample not found")
    canonical_sample = _as_dict(row.get("canonical_sample_jsonb"))
    return {
        "sample_id": row["sample_id"],
        "canonical_sample_json": canonical_sample,
        "metadata_json": _as_dict(row.get("metadata_jsonb")),
        "setup": canonical_sample.get("setup"),
        "sandbox": canonical_sample.get("sandbox"),
        "files": _as_list(canonical_sample.get("files")),
    }


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _coerce_tags(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def _operation_target_threshold(*, kind: str) -> int:
    settings = get_settings()
    if kind == "preview":
        return max(0, int(getattr(settings, "agchain_dataset_preview_sync_threshold", 200)))
    return max(0, int(getattr(settings, "agchain_dataset_materialization_sync_threshold", 200)))


def _maybe_queue_dataset_operation(
    *,
    sb,
    user_id: str,
    project_id: str,
    operation_type: str,
    target_kind: str | None,
    target_id: str | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    return create_operation(
        project_id=project_id,
        operation_type=operation_type,
        target_kind=target_kind,
        target_id=target_id,
        payload=payload,
        created_by=user_id,
        sb=sb,
    )


def _preview_response(preview: dict[str, Any]) -> dict[str, Any]:
    return {
        "ok": True,
        "preview_id": preview["preview_id"],
        "sample_count": int(preview["sample_count"]),
        "preview_samples": preview["preview_samples"],
        "validation_summary": preview["validation_summary"],
        "field_resolution_summary": preview["field_resolution_summary"],
    }


def _version_preview_response(*, dataset_version_id: str, preview: dict[str, Any]) -> dict[str, Any]:
    return {
        "ok": True,
        "dataset_version_id": dataset_version_id,
        "preview_samples": preview["preview_samples"],
        "validation_summary": preview["validation_summary"],
    }


def _create_dataset_row(
    *,
    sb,
    project_id: str,
    user_id: str,
    payload: dict[str, Any],
    source_type: str,
) -> dict[str, Any]:
    now = _now_iso()
    rows = (
        sb.table("agchain_datasets")
        .insert(
            {
                "project_id": project_id,
                "slug": payload["slug"],
                "name": payload["name"],
                "description": payload.get("description") or "",
                "tags_jsonb": _coerce_tags(payload.get("tags")),
                "status": "active",
                "source_type": source_type,
                "created_by": user_id,
                "created_at": now,
                "updated_at": now,
            }
        )
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to create AG chain dataset")
    return rows[0]


def _persist_dataset_version(
    *,
    sb,
    dataset_id: str,
    user_id: str,
    version_label: str,
    source_type: str,
    source_uri: str | None,
    source_config_jsonb: dict[str, Any],
    field_spec_jsonb: dict[str, Any],
    materialization_options_jsonb: dict[str, Any],
    preview: dict[str, Any],
    base_version_id: str | None = None,
) -> dict[str, Any]:
    now = _now_iso()
    rows = (
        sb.table("agchain_dataset_versions")
        .insert(
            {
                "dataset_id": dataset_id,
                "version_label": version_label,
                "base_version_id": base_version_id,
                "source_type": source_type,
                "source_uri": source_uri,
                "source_config_jsonb": source_config_jsonb,
                "field_spec_jsonb": field_spec_jsonb,
                "materialization_options_jsonb": materialization_options_jsonb,
                "parse_summary_jsonb": preview["parse_summary_jsonb"],
                "validation_summary_jsonb": preview["validation_summary"],
                "sample_count": int(preview["sample_count"]),
                "checksum": preview["checksum"],
                "created_by": user_id,
                "created_at": now,
                "updated_at": now,
            }
        )
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to create AG chain dataset version")
    version_row = rows[0]

    sample_rows = [
        {
            "dataset_version_id": version_row["dataset_version_id"],
            **sample_row,
        }
        for sample_row in preview["sample_rows"]
    ]
    if sample_rows:
        sb.table("agchain_dataset_samples").insert(sample_rows).execute()

    warning_counts = _as_dict(preview["validation_summary"].get("warning_counts"))
    sb.table("agchain_dataset_version_validations").insert(
        {
            "dataset_version_id": version_row["dataset_version_id"],
            "source_hash": preview["checksum"],
            "validation_status": preview["validation_summary"]["validation_status"],
            "issue_groups_jsonb": _as_list(preview["validation_summary"].get("issue_groups")),
            "warning_count": int(warning_counts.get("warning_count", 0)),
            "duplicate_id_count": int(warning_counts.get("duplicate_id_count", 0)),
            "missing_field_count": int(warning_counts.get("missing_field_count", 0)),
            "unsupported_payload_count": int(warning_counts.get("unsupported_payload_count", 0)),
            "generated_at": preview["validation_summary"].get("generated_at") or now,
        }
    ).execute()
    return version_row


def _update_dataset_latest_version(*, sb, dataset_id: str, dataset_version_id: str) -> None:
    sb.table("agchain_datasets").update(
        {
            "latest_version_id": dataset_version_id,
            "updated_at": _now_iso(),
        }
    ).eq("dataset_id", dataset_id).execute()


def _dataset_write_response(
    *,
    dataset_row: dict[str, Any],
    version_row: dict[str, Any],
    preview: dict[str, Any],
) -> dict[str, Any]:
    return {
        "ok": True,
        "dataset": {
            "dataset_id": dataset_row["dataset_id"],
            "project_id": dataset_row["project_id"],
            "slug": dataset_row["slug"],
            "name": dataset_row["name"],
            "description": dataset_row.get("description") or "",
            "tags": _as_list(dataset_row.get("tags_jsonb")),
            "status": dataset_row["status"],
            "source_type": dataset_row["source_type"],
            "latest_version_id": version_row["dataset_version_id"],
            "latest_version_label": version_row["version_label"],
            "sample_count": int(version_row.get("sample_count", 0)),
            "validation_status": preview["validation_summary"]["validation_status"],
            "updated_at": dataset_row.get("updated_at"),
        },
        "version": _normalize_version_summary(
            version_row,
            validation_row={"validation_status": preview["validation_summary"]["validation_status"]},
        ),
    }


def _load_draft_row(*, sb, dataset_id: str, draft_id: str) -> dict[str, Any]:
    row = (
        sb.table("agchain_dataset_version_drafts")
        .select("*")
        .eq("dataset_id", dataset_id)
        .eq("draft_id", draft_id)
        .maybe_single()
        .execute()
        .data
    )
    if not row:
        raise HTTPException(status_code=404, detail="AG chain dataset version draft not found")
    return row


def _ensure_open_draft(row: dict[str, Any]) -> dict[str, Any]:
    expires_at = str(row.get("expires_at") or "")
    if row.get("draft_status") == "committed":
        return row
    if expires_at:
        expires_at_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if expires_at_dt <= datetime.now(UTC):
            raise HTTPException(
                status_code=409,
                detail={"code": "draft_expired", "message": "AG chain dataset draft expired"},
            )
    if row.get("draft_status") != "open":
        raise HTTPException(
            status_code=409,
            detail={"code": "draft_closed", "message": "AG chain dataset draft is not open"},
        )
    return row


def _serialize_draft(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "draft_id": row["draft_id"],
        "base_version_id": row.get("base_version_id"),
        "version_label": row.get("version_label"),
        "source_config_jsonb": _as_dict(row.get("source_config_jsonb")),
        "field_spec_jsonb": _as_dict(row.get("field_spec_jsonb")),
        "materialization_options_jsonb": _as_dict(row.get("materialization_options_jsonb")),
        "preview_summary": _as_dict(row.get("preview_summary_jsonb")),
        "validation_summary": _as_dict(row.get("validation_summary_jsonb")),
        "dirty_state": _as_dict(row.get("dirty_state_jsonb")),
    }


def preview_dataset_source(*, user_id: str, payload: dict[str, Any], allow_async: bool = True) -> dict[str, Any]:
    sb = get_supabase_admin()
    project_id = str(payload["project_id"])
    require_project_access(user_id=user_id, project_id=project_id, sb=sb)
    preview = preview_dataset_source_materializer(
        source_type=str(payload["source_type"]),
        source_uri=payload.get("source_uri"),
        source_upload_id=payload.get("source_upload_id"),
        source_config_jsonb=_as_dict(payload.get("source_config_jsonb")),
        field_spec_jsonb=_as_dict(payload.get("field_spec_jsonb")),
        materialization_options_jsonb=_as_dict(payload.get("materialization_options_jsonb")),
    )
    if allow_async and int(preview["sample_count"]) > _operation_target_threshold(kind="preview"):
        return _maybe_queue_dataset_operation(
            sb=sb,
            user_id=user_id,
            project_id=project_id,
            operation_type="dataset_preview",
            target_kind="dataset_preview",
            target_id=None,
            payload={"mode": "new_preview", "user_id": user_id, "request": payload},
        )
    return _preview_response(preview)


def create_dataset(*, user_id: str, payload: dict[str, Any], allow_async: bool = True) -> dict[str, Any]:
    sb = get_supabase_admin()
    project_id = str(payload["project_id"])
    require_project_write_access(user_id=user_id, project_id=project_id, sb=sb)
    preview = preview_dataset_source_materializer(
        source_type=str(payload["source_type"]),
        source_uri=payload.get("source_uri"),
        source_upload_id=payload.get("source_upload_id"),
        source_config_jsonb=_as_dict(payload.get("source_config_jsonb")),
        field_spec_jsonb=_as_dict(payload.get("field_spec_jsonb")),
        materialization_options_jsonb=_as_dict(payload.get("materialization_options_jsonb")),
    )
    if allow_async and int(preview["sample_count"]) > _operation_target_threshold(kind="materialization"):
        return _maybe_queue_dataset_operation(
            sb=sb,
            user_id=user_id,
            project_id=project_id,
            operation_type="dataset_materialization",
            target_kind="dataset",
            target_id=None,
            payload={"mode": "create_dataset", "user_id": user_id, "request": payload},
        )
    dataset_row = _create_dataset_row(
        sb=sb,
        project_id=project_id,
        user_id=user_id,
        payload=payload,
        source_type=str(payload["source_type"]),
    )
    version_row = _persist_dataset_version(
        sb=sb,
        dataset_id=dataset_row["dataset_id"],
        user_id=user_id,
        version_label=str(payload.get("initial_version_label") or "v1"),
        source_type=str(payload["source_type"]),
        source_uri=payload.get("source_uri"),
        source_config_jsonb=_as_dict(payload.get("source_config_jsonb")),
        field_spec_jsonb=_as_dict(payload.get("field_spec_jsonb")),
        materialization_options_jsonb=_as_dict(payload.get("materialization_options_jsonb")),
        preview=preview,
    )
    _update_dataset_latest_version(sb=sb, dataset_id=dataset_row["dataset_id"], dataset_version_id=version_row["dataset_version_id"])
    dataset_row["latest_version_id"] = version_row["dataset_version_id"]
    dataset_row["updated_at"] = _now_iso()
    return _dataset_write_response(dataset_row=dataset_row, version_row=version_row, preview=preview)


def preview_dataset_version(
    *,
    user_id: str,
    dataset_id: str,
    dataset_version_id: str,
    payload: dict[str, Any],
    allow_async: bool = True,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    dataset, version_row, _ = _resolve_dataset_version_project(
        sb=sb,
        user_id=user_id,
        dataset_id=dataset_id,
        dataset_version_id=dataset_version_id,
    )
    if not payload.get("refresh"):
        sample_rows = (
            sb.table("agchain_dataset_samples")
            .select("*")
            .eq("dataset_version_id", dataset_version_id)
            .order("sample_id")
            .execute()
            .data
            or []
        )
        validation = get_dataset_version_validation(
            user_id=user_id,
            dataset_id=dataset_id,
            dataset_version_id=dataset_version_id,
        )
        return {
            "ok": True,
            "dataset_version_id": dataset_version_id,
            "preview_samples": [_as_dict(row.get("canonical_sample_jsonb")) for row in sample_rows],
            "validation_summary": validation,
        }

    preview = preview_dataset_source_materializer(
        source_type=str(version_row["source_type"]),
        source_uri=version_row.get("source_uri"),
        source_upload_id=None,
        source_config_jsonb=_as_dict(version_row.get("source_config_jsonb")),
        field_spec_jsonb=_as_dict(version_row.get("field_spec_jsonb")),
        materialization_options_jsonb=_as_dict(version_row.get("materialization_options_jsonb")),
    )
    if allow_async and int(preview["sample_count"]) > _operation_target_threshold(kind="preview"):
        return _maybe_queue_dataset_operation(
            sb=sb,
            user_id=user_id,
            project_id=dataset["project_id"],
            operation_type="dataset_preview",
            target_kind="dataset_version",
            target_id=dataset_version_id,
            payload={
                "mode": "version_preview",
                "user_id": user_id,
                "dataset_id": dataset_id,
                "dataset_version_id": dataset_version_id,
                "request": payload,
            },
        )
    return _version_preview_response(dataset_version_id=dataset_version_id, preview=preview)


def create_dataset_version_draft(*, user_id: str, dataset_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    sb = get_supabase_admin()
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.inspect.dataset.draft.create"):
        dataset, base_version, project = _resolve_dataset_version_project(
            sb=sb,
            user_id=user_id,
            dataset_id=dataset_id,
            dataset_version_id=str(payload["base_version_id"]),
        )
        require_project_write_access(user_id=user_id, project_id=project["project_id"], sb=sb)
        now = datetime.now(UTC)
        rows = (
            sb.table("agchain_dataset_version_drafts")
            .insert(
                {
                    "dataset_id": dataset_id,
                    "base_version_id": base_version["dataset_version_id"],
                    "version_label": base_version["version_label"],
                    "source_config_jsonb": _as_dict(base_version.get("source_config_jsonb")),
                    "field_spec_jsonb": _as_dict(base_version.get("field_spec_jsonb")),
                    "materialization_options_jsonb": _as_dict(base_version.get("materialization_options_jsonb")),
                    "preview_summary_jsonb": {
                        "sample_count": int(base_version.get("sample_count", 0)),
                        "preview_samples": [],
                    },
                    "validation_summary_jsonb": _as_dict(base_version.get("validation_summary_jsonb")),
                    "dirty_state_jsonb": {"is_dirty": False, "changed_fields": []},
                    "draft_status": "open",
                    "expires_at": (now + timedelta(days=7)).isoformat(),
                    "created_by": user_id,
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }
            )
            .execute()
            .data
            or []
        )
        if not rows:
            raise HTTPException(status_code=500, detail="Failed to create AG chain dataset draft")
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        dataset_draft_create_duration_ms.record(duration_ms, {"result": "created"})
        return {"ok": True, "draft": _serialize_draft(rows[0])}


def get_dataset_version_draft(*, user_id: str, dataset_id: str, draft_id: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    dataset, _ = _resolve_dataset_project(sb=sb, user_id=user_id, dataset_id=dataset_id)
    require_project_access(user_id=user_id, project_id=dataset["project_id"], sb=sb)
    row = _load_draft_row(sb=sb, dataset_id=dataset_id, draft_id=draft_id)
    return _serialize_draft(row)


def update_dataset_version_draft(
    *,
    user_id: str,
    dataset_id: str,
    draft_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    sb = get_supabase_admin()
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.inspect.dataset.draft.update"):
        dataset, _ = _resolve_dataset_project(sb=sb, user_id=user_id, dataset_id=dataset_id)
        require_project_write_access(user_id=user_id, project_id=dataset["project_id"], sb=sb)
        row = _ensure_open_draft(_load_draft_row(sb=sb, dataset_id=dataset_id, draft_id=draft_id))
        changed_fields: list[str] = []
        updates: dict[str, Any] = {"updated_at": _now_iso()}
        if "version_label" in payload:
            updates["version_label"] = payload["version_label"]
            changed_fields.append("version_label")
        if "source_config_jsonb" in payload:
            updates["source_config_jsonb"] = _as_dict(payload.get("source_config_jsonb"))
            changed_fields.append("source_config_jsonb")
        if "field_spec_jsonb" in payload:
            updates["field_spec_jsonb"] = _as_dict(payload.get("field_spec_jsonb"))
            changed_fields.append("field_spec_jsonb")
        if "materialization_options_jsonb" in payload:
            updates["materialization_options_jsonb"] = _as_dict(payload.get("materialization_options_jsonb"))
            changed_fields.append("materialization_options_jsonb")
        updates["dirty_state_jsonb"] = {"is_dirty": bool(changed_fields), "changed_fields": changed_fields}
        rows = (
            sb.table("agchain_dataset_version_drafts")
            .update(updates)
            .eq("draft_id", draft_id)
            .eq("dataset_id", dataset_id)
            .execute()
            .data
            or []
        )
        if not rows:
            raise HTTPException(status_code=409, detail="AG chain dataset draft update collided with another write")
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        dataset_draft_update_duration_ms.record(duration_ms, {"result": "updated"})
        return {"ok": True, "draft": _serialize_draft(rows[0])}


def preview_dataset_version_draft(
    *,
    user_id: str,
    dataset_id: str,
    draft_id: str,
    payload: dict[str, Any],
    allow_async: bool = True,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    dataset, _ = _resolve_dataset_project(sb=sb, user_id=user_id, dataset_id=dataset_id)
    require_project_access(user_id=user_id, project_id=dataset["project_id"], sb=sb)
    row = _ensure_open_draft(_load_draft_row(sb=sb, dataset_id=dataset_id, draft_id=draft_id))

    source_config = _as_dict(row.get("source_config_jsonb")) if payload.get("use_saved") else _as_dict(
        payload.get("source_config_jsonb") or row.get("source_config_jsonb")
    )
    field_spec = _as_dict(row.get("field_spec_jsonb")) if payload.get("use_saved") else _as_dict(
        payload.get("field_spec_jsonb") or row.get("field_spec_jsonb")
    )
    materialization_options = _as_dict(row.get("materialization_options_jsonb")) if payload.get("use_saved") else _as_dict(
        payload.get("materialization_options_jsonb") or row.get("materialization_options_jsonb")
    )

    base_version = _get_dataset_version_row(
        sb=sb,
        dataset_id=dataset_id,
        dataset_version_id=str(row["base_version_id"]),
    )
    preview = preview_dataset_draft_materializer(
        source_type=str(base_version["source_type"]),
        source_uri=base_version.get("source_uri"),
        source_upload_id=None,
        source_config_jsonb=source_config,
        field_spec_jsonb=field_spec,
        materialization_options_jsonb=materialization_options,
    )
    if allow_async and int(preview["sample_count"]) > _operation_target_threshold(kind="preview"):
        return _maybe_queue_dataset_operation(
            sb=sb,
            user_id=user_id,
            project_id=dataset["project_id"],
            operation_type="dataset_preview",
            target_kind="dataset_version_draft",
            target_id=draft_id,
            payload={
                "mode": "draft_preview",
                "user_id": user_id,
                "dataset_id": dataset_id,
                "draft_id": draft_id,
                "request": payload,
            },
        )
    return {
        "ok": True,
        "preview_samples": preview["preview_samples"],
        "validation_summary": preview["validation_summary"],
        "diff_summary": {
            "changed_fields": sorted(
                {
                    key
                    for key in ("source_config_jsonb", "field_spec_jsonb", "materialization_options_jsonb", "version_label")
                    if key in payload
                }
            )
        },
    }


def commit_dataset_version_draft(
    *,
    user_id: str,
    dataset_id: str,
    draft_id: str,
    payload: dict[str, Any],
    allow_async: bool = True,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    dataset, project = _resolve_dataset_project(sb=sb, user_id=user_id, dataset_id=dataset_id)
    require_project_write_access(user_id=user_id, project_id=project["project_id"], sb=sb)
    row = _load_draft_row(sb=sb, dataset_id=dataset_id, draft_id=draft_id)

    if row.get("draft_status") == "committed":
        committed_version_id = _as_dict(row.get("dirty_state_jsonb")).get("committed_version_id")
        if committed_version_id:
            version_row = _get_dataset_version_row(sb=sb, dataset_id=dataset_id, dataset_version_id=str(committed_version_id))
            preview = {"validation_summary": _as_dict(version_row.get("validation_summary_jsonb")) or {"validation_status": "unknown"}}
            return _dataset_write_response(dataset_row=dataset, version_row=version_row, preview=preview)

    row = _ensure_open_draft(row)
    base_version = _get_dataset_version_row(
        sb=sb,
        dataset_id=dataset_id,
        dataset_version_id=str(row["base_version_id"]),
    )
    preview = preview_dataset_draft_materializer(
        source_type=str(base_version["source_type"]),
        source_uri=base_version.get("source_uri"),
        source_upload_id=None,
        source_config_jsonb=_as_dict(row.get("source_config_jsonb")),
        field_spec_jsonb=_as_dict(row.get("field_spec_jsonb")),
        materialization_options_jsonb=_as_dict(row.get("materialization_options_jsonb")),
    )
    if allow_async and int(preview["sample_count"]) > _operation_target_threshold(kind="materialization"):
        return _maybe_queue_dataset_operation(
            sb=sb,
            user_id=user_id,
            project_id=dataset["project_id"],
            operation_type="dataset_materialization",
            target_kind="dataset",
            target_id=dataset_id,
            payload={
                "mode": "draft_commit",
                "user_id": user_id,
                "dataset_id": dataset_id,
                "draft_id": draft_id,
                "request": payload,
            },
        )
    version_row = _persist_dataset_version(
        sb=sb,
        dataset_id=dataset_id,
        user_id=user_id,
        version_label=str(row.get("version_label") or f"{base_version['version_label']}-next"),
        source_type=str(base_version["source_type"]),
        source_uri=base_version.get("source_uri"),
        source_config_jsonb=_as_dict(row.get("source_config_jsonb")),
        field_spec_jsonb=_as_dict(row.get("field_spec_jsonb")),
        materialization_options_jsonb=_as_dict(row.get("materialization_options_jsonb")),
        preview=preview,
        base_version_id=base_version["dataset_version_id"],
    )
    _update_dataset_latest_version(sb=sb, dataset_id=dataset_id, dataset_version_id=version_row["dataset_version_id"])
    dirty_state = _as_dict(row.get("dirty_state_jsonb"))
    dirty_state["committed_version_id"] = version_row["dataset_version_id"]
    sb.table("agchain_dataset_version_drafts").update(
        {
            "draft_status": "committed",
            "dirty_state_jsonb": dirty_state,
            "updated_at": _now_iso(),
        }
    ).eq("draft_id", draft_id).eq("dataset_id", dataset_id).execute()
    dataset["latest_version_id"] = version_row["dataset_version_id"]
    dataset["updated_at"] = _now_iso()
    return _dataset_write_response(dataset_row=dataset, version_row=version_row, preview=preview)


def _run_dataset_preview_operation(*, operation: dict[str, Any], heartbeat) -> dict[str, Any]:
    payload = _as_dict(operation.get("payload_jsonb"))
    mode = str(payload.get("mode") or "")
    if mode == "new_preview":
        return preview_dataset_source(
            user_id=str(payload["user_id"]),
            payload=_as_dict(payload.get("request")),
            allow_async=False,
        )
    if mode == "version_preview":
        return preview_dataset_version(
            user_id=str(payload["user_id"]),
            dataset_id=str(payload["dataset_id"]),
            dataset_version_id=str(payload["dataset_version_id"]),
            payload=_as_dict(payload.get("request")),
            allow_async=False,
        )
    if mode == "draft_preview":
        return preview_dataset_version_draft(
            user_id=str(payload["user_id"]),
            dataset_id=str(payload["dataset_id"]),
            draft_id=str(payload["draft_id"]),
            payload=_as_dict(payload.get("request")),
            allow_async=False,
        )
    raise RuntimeError(f"Unsupported dataset preview operation mode: {mode}")


def _run_dataset_materialization_operation(*, operation: dict[str, Any], heartbeat) -> dict[str, Any]:
    payload = _as_dict(operation.get("payload_jsonb"))
    mode = str(payload.get("mode") or "")
    if mode == "create_dataset":
        return create_dataset(
            user_id=str(payload["user_id"]),
            payload=_as_dict(payload.get("request")),
            allow_async=False,
        )
    if mode == "draft_commit":
        return commit_dataset_version_draft(
            user_id=str(payload["user_id"]),
            dataset_id=str(payload["dataset_id"]),
            draft_id=str(payload["draft_id"]),
            payload=_as_dict(payload.get("request")),
            allow_async=False,
        )
    raise RuntimeError(f"Unsupported dataset materialization operation mode: {mode}")


try:  # pragma: no cover - registration side effect
    from app.workers.agchain_operations import register_operation_handler

    register_operation_handler("dataset_preview", _run_dataset_preview_operation)
    register_operation_handler("dataset_materialization", _run_dataset_materialization_operation)
except Exception:
    pass
