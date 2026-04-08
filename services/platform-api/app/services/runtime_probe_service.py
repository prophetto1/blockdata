from __future__ import annotations

from datetime import UTC, datetime
from time import perf_counter
from typing import Any

from app.infra.supabase_client import get_supabase_admin
from app.observability.pipeline_metrics import log_pipeline_probe_verified
from app.pipelines.registry import get_pipeline_definition
from app.services import pipeline_source_sets as pipeline_source_sets_service
from app.services.pipeline_storage import store_pipeline_probe_source
from app.services.runtime_readiness import get_runtime_readiness_check
from app.workers.pipeline_jobs import run_pipeline_job_now

_PIPELINE_BROWSER_UPLOAD_PROBE_KIND = "pipeline_browser_upload_probe"
_PIPELINE_JOB_EXECUTION_PROBE_KIND = "pipeline_job_execution_probe"


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


def get_latest_runtime_probe_run_for_probe_kind(*, probe_kind: str, supabase_admin=None) -> dict[str, Any] | None:
    admin = supabase_admin or get_supabase_admin()
    return _extract_single_row(
        admin.table("runtime_probe_runs")
        .select("*")
        .eq("probe_kind", probe_kind)
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


def _probe_source_uid(pipeline_kind: str) -> str:
    return f"runtime-probe-{pipeline_kind}"


def _probe_source_set_label(definition: dict[str, Any]) -> str:
    return f"Runtime Probe - {definition['label']} (managed)"


def _build_probe_filename(definition: dict[str, Any]) -> str:
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    return f"runtime-probe-{definition['storage_service_slug']}-{timestamp}.md"


def _build_probe_markdown_bytes(definition: dict[str, Any]) -> bytes:
    body = (
        f"# Runtime Probe\n\n"
        f"This managed markdown document certifies the {definition['label']} pipeline runtime path.\n"
    )
    return body.encode("utf-8")


def _stage_pipeline_probe_source_upload(
    *,
    project_id: str,
    pipeline_kind: str,
    actor_id: str,
    supabase_admin=None,
) -> dict[str, Any]:
    definition = get_pipeline_definition(pipeline_kind)
    if definition is None:
        raise RuntimeError("Unknown pipeline kind")
    return store_pipeline_probe_source(
        owner_id=actor_id,
        project_id=project_id,
        pipeline_kind=pipeline_kind,
        source_uid=_probe_source_uid(pipeline_kind),
        filename=_build_probe_filename(definition),
        doc_title=_probe_source_set_label(definition),
        markdown_bytes=_build_probe_markdown_bytes(definition),
        supabase_admin=supabase_admin,
    )


def _prepare_pipeline_probe_source_set(
    *,
    project_id: str,
    pipeline_kind: str,
    pipeline_source_id: str,
    actor_id: str,
    supabase_admin=None,
) -> dict[str, Any]:
    admin = supabase_admin or get_supabase_admin()
    definition = get_pipeline_definition(pipeline_kind)
    if definition is None:
        raise RuntimeError("Unknown pipeline kind")
    label = _probe_source_set_label(definition)
    existing = _extract_single_row(
        admin.table("pipeline_source_sets")
        .select("source_set_id")
        .eq("owner_id", actor_id)
        .eq("project_id", project_id)
        .eq("pipeline_kind", pipeline_kind)
        .eq("label", label)
        .limit(1)
        .execute()
        .data
    )
    if existing:
        return pipeline_source_sets_service.update_source_set(
            admin,
            owner_id=actor_id,
            pipeline_kind=pipeline_kind,
            source_set_id=str(existing["source_set_id"]),
            label=label,
            pipeline_source_ids=[pipeline_source_id],
            eligible_source_types=list(definition["eligible_source_types"]),
        )
    return pipeline_source_sets_service.create_source_set(
        admin,
        owner_id=actor_id,
        pipeline_kind=pipeline_kind,
        project_id=project_id,
        label=label,
        pipeline_source_ids=[pipeline_source_id],
        eligible_source_types=list(definition["eligible_source_types"]),
    )


def _run_pipeline_probe_job(
    *,
    project_id: str,
    pipeline_kind: str,
    source_upload: dict[str, Any],
    source_set: dict[str, Any],
    actor_id: str,
    supabase_admin=None,
) -> dict[str, Any]:
    admin = supabase_admin or get_supabase_admin()
    row = _extract_single_row(
        admin.table("pipeline_jobs")
        .insert(
            {
                "pipeline_kind": pipeline_kind,
                "owner_id": actor_id,
                "project_id": project_id,
                "pipeline_source_id": source_upload["pipeline_source_id"],
                "source_uid": source_upload["source_uid"],
                "source_set_id": source_set["source_set_id"],
                "status": "queued",
                "stage": "queued",
            }
        )
        .execute()
        .data
    )
    if row is None:
        raise RuntimeError("Failed to create pipeline probe job")
    return run_pipeline_job_now(job_id=str(row["job_id"]), pipeline_kind=pipeline_kind)


def _verify_pipeline_probe_deliverable_download(
    *,
    job_id: str,
    actor_id: str,
    supabase_admin=None,
) -> dict[str, Any]:
    from app.api.routes.pipelines import _download_storage_bytes, _load_deliverable_download_record

    admin = supabase_admin or get_supabase_admin()
    deliverable = _extract_single_row(
        admin.table("pipeline_deliverables")
        .select("deliverable_kind, filename, byte_size")
        .eq("job_id", job_id)
        .order("created_at", desc=False)
        .limit(1)
        .execute()
        .data
    )
    if deliverable is None:
        raise RuntimeError("Pipeline probe job produced no deliverables")

    record = _load_deliverable_download_record(admin, job_id, str(deliverable["deliverable_kind"]))
    if not record:
        raise RuntimeError("Pipeline probe deliverable is not downloadable")
    _download_storage_bytes(record["bucket"], record["object_key"])
    return {
        "deliverable_kind": deliverable["deliverable_kind"],
        "filename": deliverable["filename"],
        "byte_size": deliverable.get("byte_size"),
    }


def execute_pipeline_browser_upload_probe(
    *,
    project_id: str,
    pipeline_kind: str,
    actor_id: str,
    supabase_admin=None,
) -> dict[str, Any]:
    started = perf_counter()
    evidence: dict[str, Any] = {"project_id": project_id, "pipeline_kind": pipeline_kind}
    result = "ok"
    failure_reason = None

    try:
        source_upload = _stage_pipeline_probe_source_upload(
            project_id=project_id,
            pipeline_kind=pipeline_kind,
            actor_id=actor_id,
            supabase_admin=supabase_admin,
        )
        evidence.update(
            {
                "storage_service_slug": source_upload["storage_service_slug"],
                "source_uid": source_upload["source_uid"],
                "pipeline_source_id": source_upload["pipeline_source_id"],
                "storage_object_id": source_upload["storage_object_id"],
                "reservation_id": source_upload["reservation_id"],
                "source_registry_verified": True,
            }
        )
        log_pipeline_probe_verified(
            pipeline_kind=pipeline_kind,
            probe_kind="browser_upload",
            project_id=project_id,
        )
    except Exception as exc:
        result = "error"
        failure_reason = str(exc).strip() or type(exc).__name__
        evidence["error_type"] = type(exc).__name__

    store_kwargs = {
        "probe_kind": _PIPELINE_BROWSER_UPLOAD_PROBE_KIND,
        "check_id": None,
        "result": result,
        "duration_ms": (perf_counter() - started) * 1000.0,
        "evidence": evidence,
        "failure_reason": failure_reason,
        "actor_id": actor_id,
    }
    if supabase_admin is not None:
        store_kwargs["supabase_admin"] = supabase_admin
    return store_runtime_probe_run(**store_kwargs)


def execute_pipeline_job_execution_probe(
    *,
    project_id: str,
    pipeline_kind: str,
    actor_id: str,
    supabase_admin=None,
) -> dict[str, Any]:
    started = perf_counter()
    evidence: dict[str, Any] = {"project_id": project_id, "pipeline_kind": pipeline_kind}
    result = "ok"
    failure_reason = None

    try:
        source_upload = _stage_pipeline_probe_source_upload(
            project_id=project_id,
            pipeline_kind=pipeline_kind,
            actor_id=actor_id,
            supabase_admin=supabase_admin,
        )
        source_set = _prepare_pipeline_probe_source_set(
            project_id=project_id,
            pipeline_kind=pipeline_kind,
            pipeline_source_id=str(source_upload["pipeline_source_id"]),
            actor_id=actor_id,
            supabase_admin=supabase_admin,
        )
        job = _run_pipeline_probe_job(
            project_id=project_id,
            pipeline_kind=pipeline_kind,
            source_upload=source_upload,
            source_set=source_set,
            actor_id=actor_id,
            supabase_admin=supabase_admin,
        )
        deliverable = _verify_pipeline_probe_deliverable_download(
            job_id=str(job["job_id"]),
            actor_id=actor_id,
            supabase_admin=supabase_admin,
        )
        evidence.update(
            {
                "storage_service_slug": source_upload["storage_service_slug"],
                "source_uid": source_upload["source_uid"],
                "pipeline_source_id": source_upload["pipeline_source_id"],
                "source_set_id": source_set["source_set_id"],
                "source_set_member_count": source_set.get("member_count"),
                "job_id": job["job_id"],
                "deliverable_kind": deliverable["deliverable_kind"],
                "deliverable_filename": deliverable["filename"],
                "deliverable_download_verified": True,
            }
        )
        log_pipeline_probe_verified(
            pipeline_kind=pipeline_kind,
            probe_kind="job_execution",
            project_id=project_id,
            source_set_id=str(source_set["source_set_id"]),
            deliverable_kind=str(deliverable["deliverable_kind"]),
        )
    except Exception as exc:
        result = "error"
        failure_reason = str(exc).strip() or type(exc).__name__
        evidence["error_type"] = type(exc).__name__

    store_kwargs = {
        "probe_kind": _PIPELINE_JOB_EXECUTION_PROBE_KIND,
        "check_id": None,
        "result": result,
        "duration_ms": (perf_counter() - started) * 1000.0,
        "evidence": evidence,
        "failure_reason": failure_reason,
        "actor_id": actor_id,
    }
    if supabase_admin is not None:
        store_kwargs["supabase_admin"] = supabase_admin
    return store_runtime_probe_run(**store_kwargs)
