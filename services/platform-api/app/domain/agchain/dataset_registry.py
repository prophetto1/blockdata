from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.infra.supabase_client import get_supabase_admin


ALLOWED_SOURCE_TYPES = ["csv", "json", "jsonl", "huggingface"]


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
    del user_id
    sb = get_supabase_admin()
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


def get_dataset_bootstrap(*, user_id: str) -> dict[str, Any]:
    del user_id
    return {
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


def get_dataset_detail(
    *,
    user_id: str,
    project_id: str,
    dataset_id: str,
    version_id: str | None,
) -> dict[str, Any]:
    del user_id
    sb = get_supabase_admin()
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
    del user_id
    sb = get_supabase_admin()
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
    del user_id
    sb = get_supabase_admin()
    row = _get_dataset_version_row(sb=sb, dataset_id=dataset_id, dataset_version_id=dataset_version_id)
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
    del user_id
    sb = get_supabase_admin()
    row = _get_dataset_version_row(sb=sb, dataset_id=dataset_id, dataset_version_id=dataset_version_id)
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
    del user_id
    sb = get_supabase_admin()
    _get_dataset_version_row(sb=sb, dataset_id=dataset_id, dataset_version_id=dataset_version_id)
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
    del user_id
    sb = get_supabase_admin()
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
    del user_id
    sb = get_supabase_admin()
    _get_dataset_version_row(sb=sb, dataset_id=dataset_id, dataset_version_id=dataset_version_id)
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
