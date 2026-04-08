from __future__ import annotations

from time import perf_counter
from typing import Any

from app.infra.supabase_client import get_supabase_admin
from app.services.runtime_readiness import get_runtime_readiness_check


def _extract_single_row(payload: Any) -> dict[str, Any] | None:
    if isinstance(payload, list):
        return payload[0] if payload else None
    return payload if isinstance(payload, dict) else None


def store_runtime_action_run(
    *,
    action_kind: str,
    check_id: str | None,
    result: str,
    duration_ms: float,
    request: dict[str, Any],
    result_payload: dict[str, Any],
    failure_reason: str | None,
    actor_id: str,
    supabase_admin=None,
) -> dict[str, Any]:
    admin = supabase_admin or get_supabase_admin()
    row = _extract_single_row(
        admin.table("runtime_action_runs")
        .insert(
            {
                "action_kind": action_kind,
                "check_id": check_id,
                "result": result,
                "duration_ms": duration_ms,
                "request": request,
                "result_payload": result_payload,
                "failure_reason": failure_reason,
                "actor_id": actor_id,
            }
        )
        .execute()
        .data
    )
    if row is None:
        raise RuntimeError("Failed to persist runtime action run")
    return row


def store_runtime_probe_run(
    *,
    probe_kind: str,
    check_id: str | None,
    result: str,
    duration_ms: float,
    evidence: dict[str, Any],
    failure_reason: str | None,
    actor_id: str,
    supabase_admin=None,
) -> dict[str, Any]:
    admin = supabase_admin or get_supabase_admin()
    row = _extract_single_row(
        admin.table("runtime_probe_runs")
        .insert(
            {
                "probe_kind": probe_kind,
                "check_id": check_id,
                "result": result,
                "duration_ms": duration_ms,
                "evidence": evidence,
                "failure_reason": failure_reason,
                "actor_id": actor_id,
            }
        )
        .execute()
        .data
    )
    if row is None:
        raise RuntimeError("Failed to persist runtime probe run")
    return row


def load_runtime_probe_run(*, probe_run_id: str, supabase_admin=None) -> dict[str, Any]:
    admin = supabase_admin or get_supabase_admin()
    row = _extract_single_row(
        admin.table("runtime_probe_runs")
        .select("*")
        .eq("probe_run_id", probe_run_id)
        .limit(1)
        .execute()
        .data
    )
    if row is None:
        raise RuntimeError("Runtime probe run not found")
    return row


def load_runtime_action_run(*, action_run_id: str, supabase_admin=None) -> dict[str, Any]:
    admin = supabase_admin or get_supabase_admin()
    row = _extract_single_row(
        admin.table("runtime_action_runs")
        .select("*")
        .eq("action_run_id", action_run_id)
        .limit(1)
        .execute()
        .data
    )
    if row is None:
        raise RuntimeError("Runtime action run not found")
    return row


def get_latest_runtime_probe_run_for_check(*, check_id: str, supabase_admin=None) -> dict[str, Any] | None:
    admin = supabase_admin or get_supabase_admin()
    return _extract_single_row(
        admin.table("runtime_probe_runs")
        .select("*")
        .eq("check_id", check_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
    )


def get_latest_runtime_action_run_for_check(*, check_id: str, supabase_admin=None) -> dict[str, Any] | None:
    admin = supabase_admin or get_supabase_admin()
    return _extract_single_row(
        admin.table("runtime_action_runs")
        .select("*")
        .eq("check_id", check_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
    )


def get_runtime_readiness_check_detail(
    *,
    check_id: str,
    actor_id: str,
    supabase_admin=None,
) -> dict[str, Any]:
    check = get_runtime_readiness_check(check_id=check_id, actor_id=actor_id)
    probe_kwargs = {"check_id": check_id}
    action_kwargs = {"check_id": check_id}
    if supabase_admin is not None:
        probe_kwargs["supabase_admin"] = supabase_admin
        action_kwargs["supabase_admin"] = supabase_admin
    return {
        "check": check,
        "latest_probe_run": get_latest_runtime_probe_run_for_check(**probe_kwargs),
        "latest_action_run": get_latest_runtime_action_run_for_check(**action_kwargs),
    }


def verify_runtime_readiness_check(
    *,
    check_id: str,
    actor_id: str,
    supabase_admin=None,
) -> dict[str, Any]:
    started = perf_counter()
    check = get_runtime_readiness_check(check_id=check_id, actor_id=actor_id)
    run_result = "ok" if check["status"] == "ok" else "error" if check["status"] == "unknown" else "fail"
    failure_reason = None if run_result == "ok" else check["summary"]
    probe_kwargs = {
        "probe_kind": "readiness_check_verify",
        "check_id": check_id,
        "result": run_result,
        "duration_ms": (perf_counter() - started) * 1000.0,
        "evidence": {
            "status": check["status"],
            "surface_id": check["surface_id"],
            "check_summary": check["summary"],
            "check_evidence": check["evidence"],
        },
        "failure_reason": failure_reason,
        "actor_id": actor_id,
    }
    if supabase_admin is not None:
        probe_kwargs["supabase_admin"] = supabase_admin
    probe_run = store_runtime_probe_run(**probe_kwargs)
    action_kwargs = {"check_id": check_id}
    if supabase_admin is not None:
        action_kwargs["supabase_admin"] = supabase_admin
    return {
        "check": check,
        "latest_probe_run": probe_run,
        "latest_action_run": get_latest_runtime_action_run_for_check(**action_kwargs),
    }
