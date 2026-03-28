from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

from app.infra.supabase_client import get_supabase_admin


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _slugify(value: str) -> str:
    cleaned = ''.join(ch.lower() if ch.isalnum() else '-' for ch in value.strip())
    pieces = [piece for piece in cleaned.split('-') if piece]
    if not pieces:
        raise HTTPException(status_code=422, detail="benchmark_name must contain at least one letter or number")
    return '-'.join(pieces)


def _get_benchmark_row(*, sb, user_id: str, benchmark_slug: str) -> dict[str, Any]:
    result = (
        sb.table("agchain_benchmarks")
        .select("*")
        .eq("owner_user_id", user_id)
        .eq("benchmark_slug", benchmark_slug)
        .maybe_single()
        .execute()
    )
    benchmark = result.data
    if not benchmark:
        raise HTTPException(status_code=404, detail="AG chain benchmark not found")
    return benchmark


def _get_current_version_id(benchmark: dict[str, Any]) -> str | None:
    return benchmark.get("current_draft_version_id") or benchmark.get("current_published_version_id")


def _get_version_row(*, sb, benchmark: dict[str, Any]) -> dict[str, Any] | None:
    version_id = _get_current_version_id(benchmark)
    if not version_id:
        return None
    result = (
        sb.table("agchain_benchmark_versions")
        .select("*")
        .eq("benchmark_version_id", version_id)
        .maybe_single()
        .execute()
    )
    return result.data


def _normalize_version(version: dict[str, Any] | None) -> dict[str, Any] | None:
    if not version:
        return None
    return {
        "benchmark_version_id": version["benchmark_version_id"],
        "version_label": version["version_label"],
        "version_status": version["version_status"],
        "plan_family": version["plan_family"],
        "step_count": int(version.get("step_count", 0)),
        "validation_status": version.get("validation_status", "unknown"),
        "validation_issue_count": int(version.get("validation_issue_count", 0)),
    }


def _normalize_benchmark(benchmark: dict[str, Any]) -> dict[str, Any]:
    return {
        "benchmark_id": benchmark["benchmark_id"],
        "benchmark_slug": benchmark["benchmark_slug"],
        "benchmark_name": benchmark["benchmark_name"],
        "description": benchmark.get("description") or "",
    }


def _normalize_step(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "benchmark_step_id": row["benchmark_step_id"],
        "step_order": row["step_order"],
        "step_id": row["step_id"],
        "display_name": row["display_name"],
        "step_kind": row["step_kind"],
        "api_call_boundary": row["api_call_boundary"],
        "inject_payloads": row.get("inject_payloads") or [],
        "scoring_mode": row["scoring_mode"],
        "output_contract": row.get("output_contract"),
        "scorer_ref": row.get("scorer_ref"),
        "judge_prompt_ref": row.get("judge_prompt_ref"),
        "judge_grades_step_ids": row.get("judge_grades_step_ids") or [],
        "enabled": bool(row.get("enabled", True)),
        "step_config": row.get("step_config_jsonb") or {},
        "updated_at": row["updated_at"],
    }


def _is_editable_version(version: dict[str, Any] | None) -> bool:
    return bool(version and version.get("version_status") == "draft")


def _require_editable_version(version: dict[str, Any] | None) -> dict[str, Any]:
    if not _is_editable_version(version):
        raise HTTPException(status_code=409, detail="Only the current draft benchmark version is editable")
    return version


def _derive_state(
    benchmark: dict[str, Any],
    version: dict[str, Any] | None,
    *,
    has_active_runs: bool,
) -> str:
    if benchmark.get("archived_at"):
        return "archived"
    if has_active_runs:
        return "running"
    if version and version.get("validation_status") == "fail":
        return "attention"
    if version and version.get("version_status") == "draft":
        return "draft"
    return "ready"


def _list_runs_by_benchmark(*, sb, benchmark_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
    runs_by_benchmark: dict[str, list[dict[str, Any]]] = {benchmark_id: [] for benchmark_id in benchmark_ids}
    if not benchmark_ids:
        return runs_by_benchmark

    runs_result = (
        sb.table("agchain_runs")
        .select("benchmark_id, status, evaluated_model_target_id, submitted_at, completed_at")
        .in_("benchmark_id", benchmark_ids)
        .execute()
    )
    for row in runs_result.data or []:
        runs_by_benchmark.setdefault(row["benchmark_id"], []).append(row)
    return runs_by_benchmark


def _get_selected_eval_model_count(*, sb, benchmark_version_id: str | None) -> int:
    if not benchmark_version_id:
        return 0
    selections_result = (
        sb.table("agchain_benchmark_model_targets")
        .select("benchmark_version_id, selection_role")
        .eq("benchmark_version_id", benchmark_version_id)
        .execute()
    )
    return sum(1 for row in selections_result.data or [] if row.get("selection_role") == "evaluated")


def _list_selected_eval_model_counts(*, sb, benchmark_version_ids: list[str]) -> dict[str, int]:
    counts = {benchmark_version_id: 0 for benchmark_version_id in benchmark_version_ids}
    if not benchmark_version_ids:
        return counts

    selections_result = (
        sb.table("agchain_benchmark_model_targets")
        .select("benchmark_version_id, selection_role")
        .in_("benchmark_version_id", benchmark_version_ids)
        .execute()
    )
    for row in selections_result.data or []:
        if row.get("selection_role") != "evaluated":
            continue
        version_id = row.get("benchmark_version_id")
        if isinstance(version_id, str):
            counts[version_id] = counts.get(version_id, 0) + 1
    return counts


def _get_tested_model_count(*, benchmark_id: str, runs_by_benchmark: dict[str, list[dict[str, Any]]]) -> int:
    completed_runs = [
        row
        for row in runs_by_benchmark.get(benchmark_id, [])
        if row.get("status") == "completed" and row.get("evaluated_model_target_id")
    ]
    return len({row["evaluated_model_target_id"] for row in completed_runs})


def _get_last_run_at(*, benchmark_id: str, runs_by_benchmark: dict[str, list[dict[str, Any]]]) -> str | None:
    timestamps = [
        row.get("completed_at") or row.get("submitted_at")
        for row in runs_by_benchmark.get(benchmark_id, [])
    ]
    timestamps = [timestamp for timestamp in timestamps if timestamp]
    return max(timestamps) if timestamps else None


def _load_step_rows(*, sb, benchmark_version_id: str) -> list[dict[str, Any]]:
    result = (
        sb.table("agchain_benchmark_steps")
        .select("*")
        .eq("benchmark_version_id", benchmark_version_id)
        .order("step_order")
        .execute()
    )
    return result.data or []


def _touch_benchmark_and_version(*, sb, benchmark_id: str, benchmark_version_id: str, now: str) -> None:
    sb.table("agchain_benchmark_versions").update({"updated_at": now}).eq(
        "benchmark_version_id",
        benchmark_version_id,
    ).execute()
    sb.table("agchain_benchmarks").update({"updated_at": now}).eq("benchmark_id", benchmark_id).execute()


def _refresh_step_count(*, sb, benchmark_id: str, benchmark_version_id: str, now: str) -> int:
    step_rows = _load_step_rows(sb=sb, benchmark_version_id=benchmark_version_id)
    step_count = len(step_rows)
    sb.table("agchain_benchmark_versions").update(
        {"step_count": step_count, "updated_at": now}
    ).eq("benchmark_version_id", benchmark_version_id).execute()
    sb.table("agchain_benchmarks").update({"updated_at": now}).eq("benchmark_id", benchmark_id).execute()
    return step_count


def list_benchmarks(*, user_id: str) -> list[dict[str, Any]]:
    sb = get_supabase_admin()
    benchmarks_result = (
        sb.table("agchain_benchmarks")
        .select("*")
        .eq("owner_user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    benchmarks = benchmarks_result.data or []
    if not benchmarks:
        return []

    version_ids = [
        version_id
        for benchmark in benchmarks
        if (version_id := _get_current_version_id(benchmark))
    ]
    versions_by_id: dict[str, dict[str, Any]] = {}
    if version_ids:
        versions_result = (
            sb.table("agchain_benchmark_versions")
            .select("*")
            .in_("benchmark_version_id", version_ids)
            .execute()
        )
        versions_by_id = {
            row["benchmark_version_id"]: row
            for row in (versions_result.data or [])
        }
    selected_eval_counts = _list_selected_eval_model_counts(sb=sb, benchmark_version_ids=version_ids)

    benchmark_ids = [benchmark["benchmark_id"] for benchmark in benchmarks]
    runs_by_benchmark = _list_runs_by_benchmark(sb=sb, benchmark_ids=benchmark_ids)

    items: list[dict[str, Any]] = []
    for benchmark in benchmarks:
        version_id = _get_current_version_id(benchmark)
        version = versions_by_id.get(version_id) if version_id else None
        active_runs = [
            row
            for row in runs_by_benchmark.get(benchmark["benchmark_id"], [])
            if row.get("status") in {"queued", "running"}
        ]
        version_status = version.get("version_status", "draft") if version else "draft"
        version_label = version.get("version_label", "v0.1.0") if version else "v0.1.0"
        current_spec_label = f"{version_status} {version_label}"

        items.append(
            {
                "benchmark_id": benchmark["benchmark_id"],
                "benchmark_slug": benchmark["benchmark_slug"],
                "benchmark_name": benchmark["benchmark_name"],
                "description": benchmark.get("description") or "",
                "state": _derive_state(benchmark, version, has_active_runs=bool(active_runs)),
                "current_spec_label": current_spec_label,
                "current_spec_version": version_label,
                "version_status": version_status,
                "step_count": int(version.get("step_count", 0)) if version else 0,
                "selected_eval_model_count": selected_eval_counts.get(version_id, 0) if version_id else 0,
                "tested_model_count": _get_tested_model_count(
                    benchmark_id=benchmark["benchmark_id"],
                    runs_by_benchmark=runs_by_benchmark,
                ),
                "tested_policy_bundle_count": 0,
                "validation_status": version.get("validation_status", "unknown") if version else "unknown",
                "validation_issue_count": int(version.get("validation_issue_count", 0)) if version else 0,
                "last_run_at": _get_last_run_at(
                    benchmark_id=benchmark["benchmark_id"],
                    runs_by_benchmark=runs_by_benchmark,
                ),
                "updated_at": benchmark["updated_at"],
                "href": f"/app/agchain/benchmarks/{benchmark['benchmark_slug']}#steps",
            }
        )

    return items


def create_benchmark(*, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    sb = get_supabase_admin()
    benchmark_name = (payload.get("benchmark_name") or "").strip()
    if not benchmark_name:
        raise HTTPException(status_code=422, detail="benchmark_name is required")

    benchmark_slug = _slugify(payload.get("benchmark_slug") or benchmark_name)
    description = (payload.get("description") or "").strip()
    now = _utc_now_iso()

    try:
        benchmark_insert = (
            sb.table("agchain_benchmarks")
            .insert(
                {
                    "benchmark_slug": benchmark_slug,
                    "benchmark_name": benchmark_name,
                    "description": description,
                    "owner_user_id": user_id,
                    "updated_at": now,
                }
            )
            .execute()
        )
    except Exception as exc:
        message = str(exc).lower()
        if "agchain_benchmarks_owner_user_id_benchmark_slug_key" in message or "duplicate key value" in message:
            raise HTTPException(status_code=409, detail="Benchmark slug already exists") from exc
        raise
    benchmark_rows = benchmark_insert.data or []
    if not benchmark_rows:
        raise HTTPException(status_code=500, detail="Failed to create benchmark")
    benchmark = benchmark_rows[0]

    version_insert = (
        sb.table("agchain_benchmark_versions")
        .insert(
            {
                "benchmark_id": benchmark["benchmark_id"],
                "version_label": "v0.1.0",
                "version_status": "draft",
                "plan_family": "custom",
                "created_by": user_id,
                "updated_at": now,
            }
        )
        .execute()
    )
    version_rows = version_insert.data or []
    if not version_rows:
        raise HTTPException(status_code=500, detail="Failed to create benchmark draft version")
    version = version_rows[0]

    sb.table("agchain_benchmarks").update(
        {
            "current_draft_version_id": version["benchmark_version_id"],
            "updated_at": now,
        }
    ).eq("benchmark_id", benchmark["benchmark_id"]).execute()

    return {
        "benchmark_id": benchmark["benchmark_id"],
        "benchmark_slug": benchmark_slug,
        "benchmark_version_id": version["benchmark_version_id"],
        "redirect_path": f"/app/agchain/benchmarks/{benchmark_slug}#steps",
    }


def get_benchmark_summary(*, user_id: str, benchmark_slug: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    benchmark = _get_benchmark_row(sb=sb, user_id=user_id, benchmark_slug=benchmark_slug)
    version = _get_version_row(sb=sb, benchmark=benchmark)
    runs_by_benchmark = _list_runs_by_benchmark(sb=sb, benchmark_ids=[benchmark["benchmark_id"]])

    return {
        "benchmark": _normalize_benchmark(benchmark),
        "current_version": _normalize_version(version),
        "permissions": {"can_edit": _is_editable_version(version)},
        "counts": {
            "selected_eval_model_count": _get_selected_eval_model_count(
                sb=sb,
                benchmark_version_id=version["benchmark_version_id"] if version else None,
            ),
            "tested_model_count": _get_tested_model_count(
                benchmark_id=benchmark["benchmark_id"],
                runs_by_benchmark=runs_by_benchmark,
            ),
        },
    }


def get_benchmark_steps(*, user_id: str, benchmark_slug: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    benchmark = _get_benchmark_row(sb=sb, user_id=user_id, benchmark_slug=benchmark_slug)
    version = _get_version_row(sb=sb, benchmark=benchmark)
    if not version:
        raise HTTPException(status_code=404, detail="AG chain benchmark version not found")

    steps = _load_step_rows(sb=sb, benchmark_version_id=version["benchmark_version_id"])
    return {
        "benchmark": _normalize_benchmark(benchmark),
        "current_version": _normalize_version(version),
        "can_edit": _is_editable_version(version),
        "steps": [_normalize_step(step) for step in steps],
    }


def create_benchmark_step(*, user_id: str, benchmark_slug: str, payload: dict[str, Any]) -> dict[str, Any]:
    sb = get_supabase_admin()
    benchmark = _get_benchmark_row(sb=sb, user_id=user_id, benchmark_slug=benchmark_slug)
    version = _require_editable_version(_get_version_row(sb=sb, benchmark=benchmark))
    now = _utc_now_iso()
    step_rows = _load_step_rows(sb=sb, benchmark_version_id=version["benchmark_version_id"])
    next_step_order = len(step_rows) + 1

    result = (
        sb.table("agchain_benchmark_steps")
        .insert(
            {
                "benchmark_version_id": version["benchmark_version_id"],
                "step_order": next_step_order,
                "step_id": payload["step_id"],
                "display_name": payload["display_name"],
                "step_kind": payload["step_kind"],
                "api_call_boundary": payload["api_call_boundary"],
                "inject_payloads": payload.get("inject_payloads") or [],
                "scoring_mode": payload["scoring_mode"],
                "output_contract": payload.get("output_contract"),
                "scorer_ref": payload.get("scorer_ref"),
                "judge_prompt_ref": payload.get("judge_prompt_ref"),
                "judge_grades_step_ids": payload.get("judge_grades_step_ids") or [],
                "enabled": payload.get("enabled", True),
                "step_config_jsonb": payload.get("step_config") or {},
                "updated_at": now,
            }
        )
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to create AG chain benchmark step")

    _refresh_step_count(
        sb=sb,
        benchmark_id=benchmark["benchmark_id"],
        benchmark_version_id=version["benchmark_version_id"],
        now=now,
    )

    return {
        "benchmark_step_id": rows[0]["benchmark_step_id"],
        "step_order": next_step_order,
    }


def update_benchmark_step(
    *,
    user_id: str,
    benchmark_slug: str,
    benchmark_step_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    sb = get_supabase_admin()
    benchmark = _get_benchmark_row(sb=sb, user_id=user_id, benchmark_slug=benchmark_slug)
    version = _require_editable_version(_get_version_row(sb=sb, benchmark=benchmark))
    step_result = (
        sb.table("agchain_benchmark_steps")
        .select("*")
        .eq("benchmark_step_id", benchmark_step_id)
        .eq("benchmark_version_id", version["benchmark_version_id"])
        .maybe_single()
        .execute()
    )
    if not step_result.data:
        raise HTTPException(status_code=404, detail="AG chain benchmark step not found")

    update_payload = {}
    for key in (
        "step_id",
        "display_name",
        "step_kind",
        "api_call_boundary",
        "inject_payloads",
        "scoring_mode",
        "output_contract",
        "scorer_ref",
        "judge_prompt_ref",
        "judge_grades_step_ids",
        "enabled",
    ):
        if key in payload:
            update_payload[key] = payload[key]
    if "step_config" in payload:
        update_payload["step_config_jsonb"] = payload["step_config"]
    update_payload["updated_at"] = _utc_now_iso()

    result = (
        sb.table("agchain_benchmark_steps")
        .update(update_payload)
        .eq("benchmark_step_id", benchmark_step_id)
        .eq("benchmark_version_id", version["benchmark_version_id"])
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="AG chain benchmark step not found")

    _touch_benchmark_and_version(
        sb=sb,
        benchmark_id=benchmark["benchmark_id"],
        benchmark_version_id=version["benchmark_version_id"],
        now=update_payload["updated_at"],
    )
    return {"benchmark_step_id": rows[0]["benchmark_step_id"]}


def reorder_benchmark_steps(*, user_id: str, benchmark_slug: str, ordered_step_ids: list[str]) -> dict[str, Any]:
    sb = get_supabase_admin()
    benchmark = _get_benchmark_row(sb=sb, user_id=user_id, benchmark_slug=benchmark_slug)
    version = _require_editable_version(_get_version_row(sb=sb, benchmark=benchmark))
    step_rows = _load_step_rows(sb=sb, benchmark_version_id=version["benchmark_version_id"])
    existing_step_ids = [row["benchmark_step_id"] for row in step_rows]
    if sorted(existing_step_ids) != sorted(ordered_step_ids):
        raise HTTPException(status_code=422, detail="ordered_step_ids must contain each step exactly once")

    now = _utc_now_iso()
    result = (
        sb.rpc(
            "reorder_agchain_benchmark_steps_atomic",
            {
                "p_benchmark_version_id": version["benchmark_version_id"],
                "p_ordered_step_ids": ordered_step_ids,
                "p_updated_at": now,
            },
        )
        .execute()
        .data
    )
    if isinstance(result, dict) and "step_count" in result:
        return {"step_count": int(result["step_count"])}
    return {"step_count": len(ordered_step_ids)}


def delete_benchmark_step(*, user_id: str, benchmark_slug: str, benchmark_step_id: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    benchmark = _get_benchmark_row(sb=sb, user_id=user_id, benchmark_slug=benchmark_slug)
    version = _require_editable_version(_get_version_row(sb=sb, benchmark=benchmark))
    step_result = (
        sb.table("agchain_benchmark_steps")
        .select("*")
        .eq("benchmark_step_id", benchmark_step_id)
        .eq("benchmark_version_id", version["benchmark_version_id"])
        .maybe_single()
        .execute()
    )
    if not step_result.data:
        raise HTTPException(status_code=404, detail="AG chain benchmark step not found")

    sb.table("agchain_benchmark_steps").delete().eq("benchmark_step_id", benchmark_step_id).eq(
        "benchmark_version_id",
        version["benchmark_version_id"],
    ).execute()

    now = _utc_now_iso()
    remaining_rows = _load_step_rows(sb=sb, benchmark_version_id=version["benchmark_version_id"])
    for step_order, row in enumerate(remaining_rows, start=1):
        if row["step_order"] == step_order:
            continue
        sb.table("agchain_benchmark_steps").update(
            {"step_order": step_order, "updated_at": now}
        ).eq("benchmark_step_id", row["benchmark_step_id"]).eq(
            "benchmark_version_id",
            version["benchmark_version_id"],
        ).execute()

    _refresh_step_count(
        sb=sb,
        benchmark_id=benchmark["benchmark_id"],
        benchmark_version_id=version["benchmark_version_id"],
        now=now,
    )
    return {"deleted_step_id": benchmark_step_id}
