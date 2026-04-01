from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.domain.agchain.benchmark_registry import (
    _get_benchmark_row,
    _load_step_rows,
    _next_cursor,
    _normalize_benchmark,
    _normalize_step,
    _page_offset,
    _utc_now_iso,
)
from app.domain.agchain.project_access import require_project_access, require_project_write_access
from app.infra.supabase_client import get_supabase_admin


def _load_benchmark_and_project(
    *,
    sb,
    user_id: str,
    benchmark_slug: str,
    write: bool,
) -> tuple[dict[str, Any], dict[str, Any]]:
    benchmark = _get_benchmark_row(sb=sb, benchmark_slug=benchmark_slug)
    project_id = benchmark.get("project_id")
    if not isinstance(project_id, str) or not project_id:
        raise HTTPException(status_code=409, detail="AG chain benchmark project is not initialized")
    project = (
        require_project_write_access(user_id=user_id, project_id=project_id, sb=sb)
        if write
        else require_project_access(user_id=user_id, project_id=project_id, sb=sb)
    )
    return benchmark, project


def _load_version_row(*, sb, benchmark_id: str, benchmark_version_id: str) -> dict[str, Any]:
    result = (
        sb.table("agchain_benchmark_versions")
        .select("*")
        .eq("benchmark_id", benchmark_id)
        .eq("benchmark_version_id", benchmark_version_id)
        .maybe_single()
        .execute()
    )
    version = result.data
    if not version:
        raise HTTPException(status_code=404, detail="AG chain benchmark version not found")
    return version


def _list_version_rows(*, sb, benchmark_id: str) -> list[dict[str, Any]]:
    result = (
        sb.table("agchain_benchmark_versions")
        .select("*")
        .eq("benchmark_id", benchmark_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def _load_join_rows(*, sb, table_name: str, benchmark_version_id: str) -> list[dict[str, Any]]:
    result = (
        sb.table(table_name)
        .select("*")
        .eq("benchmark_version_id", benchmark_version_id)
        .order("position")
        .execute()
    )
    return result.data or []


def _load_model_targets(*, sb, benchmark_version_id: str) -> list[dict[str, Any]]:
    result = (
        sb.table("agchain_benchmark_model_targets")
        .select("*")
        .eq("benchmark_version_id", benchmark_version_id)
        .execute()
    )
    return result.data or []


def _load_dataset_version(*, sb, dataset_version_id: str | None) -> dict[str, Any] | None:
    if not dataset_version_id:
        return None
    result = (
        sb.table("agchain_dataset_versions")
        .select("*")
        .eq("dataset_version_id", dataset_version_id)
        .maybe_single()
        .execute()
    )
    return result.data


def _load_sandbox_profile(*, sb, sandbox_profile_id: str | None) -> dict[str, Any] | None:
    if not sandbox_profile_id:
        return None
    result = (
        sb.table("agchain_sandbox_profiles")
        .select("*")
        .eq("sandbox_profile_id", sandbox_profile_id)
        .maybe_single()
        .execute()
    )
    return result.data


def _normalize_version_summary(row: dict[str, Any], *, scorer_count: int, tool_count: int) -> dict[str, Any]:
    return {
        "benchmark_version_id": row["benchmark_version_id"],
        "version_label": row.get("version_label"),
        "version_status": row.get("version_status"),
        "dataset_version_id": row.get("dataset_version_id"),
        "validation_status": row.get("validation_status", "unknown"),
        "scorer_count": scorer_count,
        "tool_count": tool_count,
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def _build_runtime_task_definition(
    *,
    version: dict[str, Any],
    step_rows: list[dict[str, Any]],
    scorer_refs: list[dict[str, Any]],
    tool_refs: list[dict[str, Any]],
    model_targets: list[dict[str, Any]],
) -> tuple[dict[str, Any], str]:
    stored = version.get("task_definition_jsonb")
    if isinstance(stored, dict) and stored:
        return stored, "stored_snapshot"

    runtime = {
        "dataset_version_id": version.get("dataset_version_id"),
        "task_name": version.get("task_name"),
        "task_file_ref": version.get("task_file_ref"),
        "steps": [_normalize_step(row) for row in step_rows],
        "solver_plan_jsonb": version.get("solver_plan_jsonb") or {},
        "scorer_refs_jsonb": scorer_refs,
        "tool_refs_jsonb": tool_refs,
        "sandbox_profile_id": version.get("sandbox_profile_id"),
        "sandbox_overrides_jsonb": version.get("sandbox_overrides_jsonb") or {},
        "model_roles_jsonb": version.get("model_roles_jsonb") or {},
        "generate_config_jsonb": version.get("generate_config_jsonb") or {},
        "eval_config_jsonb": version.get("eval_config_jsonb") or {},
        "model_targets": [
            {
                "model_target_id": row.get("model_target_id"),
                "selection_role": row.get("selection_role"),
            }
            for row in model_targets
        ],
    }
    return runtime, "resolved_from_steps"


def _validate_runtime_definition(
    *,
    version: dict[str, Any],
    runtime_task_definition: dict[str, Any],
    scorer_refs: list[dict[str, Any]],
    tool_refs: list[dict[str, Any]],
    model_targets: list[dict[str, Any]],
    sandbox_profile: dict[str, Any] | None,
) -> dict[str, Any]:
    issues: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []

    if not runtime_task_definition.get("dataset_version_id"):
        issues.append({"code": "missing_dataset_version", "message": "dataset_version_id is required"})
    if not runtime_task_definition.get("steps") and not version.get("task_definition_jsonb"):
        issues.append({"code": "missing_steps", "message": "At least one benchmark step is required"})
    if version.get("sandbox_profile_id") and not sandbox_profile:
        issues.append({"code": "missing_sandbox_profile", "message": "sandbox_profile_id could not be resolved"})
    if not model_targets:
        warnings.append({"code": "no_model_targets", "message": "No benchmark model targets are attached"})

    validation_status = "fail" if issues else "warn" if warnings else "pass"
    return {
        "issues": issues,
        "warnings": warnings,
        "resolved_refs": {
            "dataset_version_id": runtime_task_definition.get("dataset_version_id"),
            "scorer_version_ids": [row.get("scorer_version_id") for row in scorer_refs if row.get("scorer_version_id")],
            "tool_version_ids": [row.get("tool_version_id") for row in tool_refs if row.get("tool_version_id")],
            "sandbox_profile_id": sandbox_profile.get("sandbox_profile_id") if sandbox_profile else None,
            "model_target_ids": [row.get("model_target_id") for row in model_targets if row.get("model_target_id")],
        },
        "compatibility_summary": {
            "validation_status": validation_status,
            "issue_count": len(issues),
            "warning_count": len(warnings),
            "task_definition_source": "stored_snapshot"
            if isinstance(version.get("task_definition_jsonb"), dict) and version.get("task_definition_jsonb")
            else "resolved_from_steps",
        },
    }


def list_benchmark_versions(
    *,
    user_id: str,
    benchmark_slug: str,
    limit: int,
    cursor: str | None,
    offset: int,
) -> dict[str, Any]:
    sb = get_supabase_admin()
    benchmark, _ = _load_benchmark_and_project(sb=sb, user_id=user_id, benchmark_slug=benchmark_slug, write=False)
    versions = _list_version_rows(sb=sb, benchmark_id=benchmark["benchmark_id"])
    version_ids = [row["benchmark_version_id"] for row in versions]

    scorer_counts = {version_id: 0 for version_id in version_ids}
    if version_ids:
        for row in (
            sb.table("agchain_benchmark_version_scorers")
            .select("benchmark_version_id")
            .in_("benchmark_version_id", version_ids)
            .execute()
            .data
            or []
        ):
            version_id = row.get("benchmark_version_id")
            if isinstance(version_id, str):
                scorer_counts[version_id] = scorer_counts.get(version_id, 0) + 1

    tool_counts = {version_id: 0 for version_id in version_ids}
    if version_ids:
        for row in (
            sb.table("agchain_benchmark_version_tools")
            .select("benchmark_version_id")
            .in_("benchmark_version_id", version_ids)
            .execute()
            .data
            or []
        ):
            version_id = row.get("benchmark_version_id")
            if isinstance(version_id, str):
                tool_counts[version_id] = tool_counts.get(version_id, 0) + 1

    items = [
        _normalize_version_summary(
            row,
            scorer_count=scorer_counts.get(row["benchmark_version_id"], 0),
            tool_count=tool_counts.get(row["benchmark_version_id"], 0),
        )
        for row in versions
    ]
    start = _page_offset(cursor=cursor, offset=offset)
    return {
        "items": items[start:start + limit],
        "next_cursor": _next_cursor(start=start, limit=limit, total=len(items)),
    }


def create_benchmark_version(*, user_id: str, benchmark_slug: str, payload: dict[str, Any]) -> dict[str, Any]:
    sb = get_supabase_admin()
    benchmark, _ = _load_benchmark_and_project(sb=sb, user_id=user_id, benchmark_slug=benchmark_slug, write=True)
    version_label = (payload.get("version_label") or "").strip()
    dataset_version_id = (payload.get("dataset_version_id") or "").strip()
    if not version_label:
        raise HTTPException(status_code=422, detail="version_label is required")
    if not dataset_version_id:
        raise HTTPException(status_code=422, detail="dataset_version_id is required")

    now = _utc_now_iso()
    version_status = "published" if payload.get("publish") else "draft"
    result = (
        sb.table("agchain_benchmark_versions")
        .insert(
            {
                "benchmark_id": benchmark["benchmark_id"],
                "version_label": version_label,
                "version_status": version_status,
                "plan_family": "custom",
                "created_by": user_id,
                "updated_at": now,
                "dataset_version_id": dataset_version_id,
                "task_name": payload.get("task_name"),
                "task_file_ref": payload.get("task_file_ref"),
                "task_definition_jsonb": payload.get("task_definition_jsonb"),
                "solver_plan_jsonb": payload.get("solver_plan_jsonb") or {},
                "sandbox_profile_id": payload.get("sandbox_profile_id"),
                "sandbox_overrides_jsonb": payload.get("sandbox_overrides_jsonb") or {},
                "model_roles_jsonb": payload.get("model_roles_jsonb") or {},
                "generate_config_jsonb": payload.get("generate_config_jsonb") or {},
                "eval_config_jsonb": payload.get("eval_config_jsonb") or {},
                "validation_summary_jsonb": {},
            }
        )
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to create AG chain benchmark version")
    version = rows[0]

    for position, ref in enumerate(payload.get("scorer_refs_jsonb") or [], start=1):
        sb.table("agchain_benchmark_version_scorers").insert(
            {
                "benchmark_version_id": version["benchmark_version_id"],
                "scorer_version_id": ref.get("scorer_version_id"),
                "position": position,
                "alias": ref.get("alias"),
                "config_overrides_jsonb": ref.get("config_overrides_jsonb") or {},
            }
        ).execute()

    for position, ref in enumerate(payload.get("tool_refs_jsonb") or [], start=1):
        sb.table("agchain_benchmark_version_tools").insert(
            {
                "benchmark_version_id": version["benchmark_version_id"],
                "tool_version_id": ref.get("tool_version_id"),
                "position": position,
                "alias": ref.get("alias"),
                "config_overrides_jsonb": ref.get("config_overrides_jsonb") or {},
            }
        ).execute()

    benchmark_update = {
        "updated_at": now,
        "current_published_version_id": version["benchmark_version_id"] if payload.get("publish") else benchmark.get("current_published_version_id"),
        "current_draft_version_id": None if payload.get("publish") else version["benchmark_version_id"],
    }
    sb.table("agchain_benchmarks").update(benchmark_update).eq("benchmark_id", benchmark["benchmark_id"]).execute()

    validation = validate_benchmark_version(
        user_id=user_id,
        benchmark_slug=benchmark_slug,
        payload={"benchmark_version_id": version["benchmark_version_id"]},
    )
    detail = get_benchmark_version(
        user_id=user_id,
        benchmark_slug=benchmark_slug,
        benchmark_version_id=version["benchmark_version_id"],
    )
    return {
        "benchmark_version": detail["benchmark_version"],
        "validation_summary": validation["compatibility_summary"],
    }


def get_benchmark_version(*, user_id: str, benchmark_slug: str, benchmark_version_id: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    benchmark, _ = _load_benchmark_and_project(sb=sb, user_id=user_id, benchmark_slug=benchmark_slug, write=False)
    version = _load_version_row(sb=sb, benchmark_id=benchmark["benchmark_id"], benchmark_version_id=benchmark_version_id)

    scorer_refs = _load_join_rows(
        sb=sb,
        table_name="agchain_benchmark_version_scorers",
        benchmark_version_id=benchmark_version_id,
    )
    tool_refs = _load_join_rows(
        sb=sb,
        table_name="agchain_benchmark_version_tools",
        benchmark_version_id=benchmark_version_id,
    )
    step_rows = _load_step_rows(sb=sb, benchmark_version_id=benchmark_version_id)
    model_targets = _load_model_targets(sb=sb, benchmark_version_id=benchmark_version_id)
    runtime_task_definition, _ = _build_runtime_task_definition(
        version=version,
        step_rows=step_rows,
        scorer_refs=scorer_refs,
        tool_refs=tool_refs,
        model_targets=model_targets,
    )

    return {
        "benchmark": _normalize_benchmark(benchmark),
        "benchmark_version": {
            "benchmark_version_id": version["benchmark_version_id"],
            "version_label": version.get("version_label"),
            "version_status": version.get("version_status"),
            "dataset_version_id": version.get("dataset_version_id"),
            "task_name": version.get("task_name"),
            "task_file_ref": version.get("task_file_ref"),
            "task_definition_jsonb": runtime_task_definition,
            "solver_plan_jsonb": version.get("solver_plan_jsonb") or {},
            "sandbox_profile_id": version.get("sandbox_profile_id"),
        },
        "dataset_version": _load_dataset_version(sb=sb, dataset_version_id=version.get("dataset_version_id")),
        "scorer_refs": scorer_refs,
        "tool_refs": tool_refs,
        "sandbox_profile": _load_sandbox_profile(sb=sb, sandbox_profile_id=version.get("sandbox_profile_id")),
        "model_roles": version.get("model_roles_jsonb") or {},
        "generate_config": version.get("generate_config_jsonb") or {},
        "eval_config": version.get("eval_config_jsonb") or {},
        "validation_summary": version.get("validation_summary_jsonb") or {},
    }


def validate_benchmark_version(*, user_id: str, benchmark_slug: str, payload: dict[str, Any]) -> dict[str, Any]:
    sb = get_supabase_admin()
    benchmark, _ = _load_benchmark_and_project(sb=sb, user_id=user_id, benchmark_slug=benchmark_slug, write=True)
    benchmark_version_id = payload.get("benchmark_version_id")
    if not isinstance(benchmark_version_id, str) or not benchmark_version_id:
        raise HTTPException(status_code=422, detail="benchmark_version_id is required")

    version = _load_version_row(sb=sb, benchmark_id=benchmark["benchmark_id"], benchmark_version_id=benchmark_version_id)
    scorer_refs = _load_join_rows(
        sb=sb,
        table_name="agchain_benchmark_version_scorers",
        benchmark_version_id=benchmark_version_id,
    )
    tool_refs = _load_join_rows(
        sb=sb,
        table_name="agchain_benchmark_version_tools",
        benchmark_version_id=benchmark_version_id,
    )
    step_rows = _load_step_rows(sb=sb, benchmark_version_id=benchmark_version_id)
    model_targets = _load_model_targets(sb=sb, benchmark_version_id=benchmark_version_id)
    runtime_task_definition, task_definition_source = _build_runtime_task_definition(
        version=version,
        step_rows=step_rows,
        scorer_refs=scorer_refs,
        tool_refs=tool_refs,
        model_targets=model_targets,
    )
    sandbox_profile = _load_sandbox_profile(sb=sb, sandbox_profile_id=version.get("sandbox_profile_id"))
    validation = _validate_runtime_definition(
        version=version,
        runtime_task_definition=runtime_task_definition,
        scorer_refs=scorer_refs,
        tool_refs=tool_refs,
        model_targets=model_targets,
        sandbox_profile=sandbox_profile,
    )
    compatibility_summary = {
        **validation["compatibility_summary"],
        "task_definition_source": task_definition_source,
    }
    validation_summary = {
        **compatibility_summary,
        "issues": validation["issues"],
        "warnings": validation["warnings"],
        "resolved_refs": validation["resolved_refs"],
    }

    sb.table("agchain_benchmark_versions").update(
        {
            "task_definition_jsonb": runtime_task_definition,
            "validation_summary_jsonb": validation_summary,
            "validation_status": compatibility_summary["validation_status"],
            "validation_issue_count": compatibility_summary["issue_count"] + compatibility_summary["warning_count"],
            "updated_at": _utc_now_iso(),
        }
    ).eq("benchmark_version_id", benchmark_version_id).execute()

    sb.table("agchain_benchmarks").update({"updated_at": _utc_now_iso()}).eq(
        "benchmark_id",
        benchmark["benchmark_id"],
    ).execute()

    return {
        "issues": validation["issues"],
        "warnings": validation["warnings"],
        "resolved_refs": validation["resolved_refs"],
        "compatibility_summary": compatibility_summary,
    }
