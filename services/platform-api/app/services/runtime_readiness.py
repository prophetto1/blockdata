from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from time import perf_counter
from typing import Callable, Literal

from app.api.routes.storage import _gcs_client, create_signed_upload_url
from app.core.config import Settings, get_settings
from app.domain.agchain import list_model_targets, list_supported_providers
from app.domain.agchain.benchmark_registry import list_benchmarks
from app.infra.supabase_client import get_supabase_admin
from app.observability import get_telemetry_status
from app.observability.contract import set_span_attributes
from app.observability.runtime_readiness_metrics import (
    record_runtime_readiness_check,
    tracer,
)
from app.pipelines.registry import list_pipeline_definitions
from app.workers.conversion_pool import get_conversion_pool

logger = logging.getLogger("platform-api.runtime-readiness")

SurfaceId = Literal["shared", "blockdata", "agchain"]
CheckFactory = Callable[[Settings, str], dict]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _summary_from_checks(checks: list[dict]) -> dict[str, int]:
    summary = {"ok": 0, "warn": 0, "fail": 0, "unknown": 0}
    for check in checks:
      summary[check["status"]] += 1
    return summary


def _make_check(
    *,
    check_id: str,
    category: str,
    status: str,
    label: str,
    summary: str,
    evidence: dict,
    remediation: str,
    cause: str | None = None,
    cause_confidence: Literal["high", "medium", "low"] | None = None,
    depends_on: list[dict] | None = None,
    blocked_by: list[dict] | None = None,
    available_actions: list[dict] | None = None,
    verify_after: list[dict] | None = None,
    next_if_still_failing: list[dict] | None = None,
    actionability: Literal["backend_action", "backend_probe", "external_change", "info_only"] = "info_only",
) -> dict:
    return {
        "id": check_id,
        "category": category,
        "status": status,
        "label": label,
        "summary": summary,
        "cause": cause,
        "cause_confidence": cause_confidence,
        "depends_on": depends_on or [],
        "blocked_by": blocked_by or [],
        "available_actions": available_actions or [],
        "verify_after": verify_after or [],
        "next_if_still_failing": next_if_still_failing or [],
        "actionability": actionability,
        "evidence": evidence,
        "remediation": remediation,
        "checked_at": _utc_now_iso(),
    }


def _make_unknown_check(
    *,
    check_id: str,
    category: str,
    label: str,
    exc: Exception,
) -> dict:
    return _make_check(
        check_id=check_id,
        category=category,
        status="unknown",
        label=label,
        summary=f"{label} could not be evaluated safely.",
        evidence={"error_type": type(exc).__name__},
        remediation="Inspect platform-api logs and rerun the readiness snapshot.",
    )


def _runtime_environment() -> str:
    if os.getenv("K_SERVICE") or os.getenv("K_REVISION") or os.getenv("K_CONFIGURATION"):
        return "cloud_run"
    return "local"


def _credential_identity_evidence() -> dict[str, str | None]:
    try:
        creds = getattr(_gcs_client(), "_credentials", None)
    except Exception:
        creds = None
    return {
        "service_account_email": getattr(creds, "service_account_email", None),
        "credential_class": type(creds).__name__ if creds is not None else None,
    }


def _storage_signing_evidence(bucket_name: str) -> dict[str, object]:
    try:
        creds = getattr(_gcs_client(), "_credentials", None)
    except Exception:
        creds = None
    has_local_signer = bool(creds and hasattr(creds, "sign_bytes"))
    service_account_email = getattr(creds, "service_account_email", None)
    uses_iam_signblob = bool(service_account_email) and not has_local_signer
    return {
        "bucket_name": bucket_name,
        "credential_class": type(creds).__name__ if creds is not None else None,
        "service_account_email": service_account_email,
        "has_local_signer": has_local_signer,
        "uses_iam_signblob": uses_iam_signblob,
        "has_access_token": bool(getattr(creds, "token", None)),
        "signing_mode": "local_private_key_required" if has_local_signer else "iam_signblob" if uses_iam_signblob else "unknown",
    }


def _parse_google_error_info(exc: Exception) -> dict[str, str | None]:
    message = str(exc)
    payload_match = re.search(r"b'(?P<payload>\{.*\})'", message, re.DOTALL)
    payload = None
    if payload_match:
        try:
            payload = json.loads(payload_match.group("payload"))
        except json.JSONDecodeError:
            payload = None
    error = payload.get("error") if isinstance(payload, dict) else None
    details = error.get("details") if isinstance(error, dict) else None
    error_info = details[0] if isinstance(details, list) and details else {}
    metadata = error_info.get("metadata") if isinstance(error_info, dict) else {}
    return {
        "error_status": error.get("status") if isinstance(error, dict) else None,
        "error_reason": error_info.get("reason") if isinstance(error_info, dict) else None,
        "error_service": metadata.get("service") if isinstance(metadata, dict) else None,
        "error_method": metadata.get("method") if isinstance(metadata, dict) else None,
    }


def _flatten_cors_rules(cors_rules: list[dict]) -> tuple[list[str], list[str], list[str]]:
    origins: set[str] = set()
    methods: set[str] = set()
    response_headers: set[str] = set()
    for rule in cors_rules:
        if not isinstance(rule, dict):
            continue
        origins.update(str(origin) for origin in (rule.get("origin") or []))
        methods.update(str(method).upper() for method in (rule.get("method") or []))
        response_headers.update(str(header) for header in (rule.get("responseHeader") or []))
    return sorted(origins), sorted(methods), sorted(response_headers)


def check_shared_platform_api_ready(_settings: Settings) -> dict:
    identity_evidence = {
        "runtime_environment": _runtime_environment(),
        "service_name": os.getenv("K_SERVICE"),
        "revision_name": os.getenv("K_REVISION"),
        "configuration_name": os.getenv("K_CONFIGURATION"),
        **_credential_identity_evidence(),
    }
    try:
        pool_status = get_conversion_pool().status()
    except Exception as exc:
        logger.warning(
            "Failed to inspect conversion pool status for runtime readiness",
            exc_info=exc,
        )
        return _make_check(
            check_id="shared.platform_api.ready",
            category="process",
            status="unknown",
            label="Platform API readiness",
            summary="Platform API readiness could not be evaluated safely.",
            evidence={
                "ready": False,
                "saturated": None,
                "error_type": type(exc).__name__,
                **identity_evidence,
            },
            remediation="Verify conversion pool availability and rerun the readiness snapshot.",
            cause="The process is running, but conversion-pool state could not be inspected.",
            cause_confidence="medium",
            verify_after=[
                {
                    "probe_kind": "readiness_check_verify",
                    "label": "Refresh the readiness snapshot",
                    "route": "/admin/runtime/readiness?surface=shared",
                }
            ],
            actionability="backend_probe",
        )
    saturated = bool(pool_status.get("saturated"))
    return _make_check(
        check_id="shared.platform_api.ready",
        category="process",
        status="warn" if saturated else "ok",
        label="Platform API readiness",
        summary="Platform API process is healthy and ready." if not saturated else "Platform API is up, but the conversion pool is saturated.",
        evidence={
            "ready": not saturated,
            "saturated": saturated,
            "pool_size": pool_status.get("pool_size"),
            "active_tasks": pool_status.get("active_tasks"),
            **identity_evidence,
        },
        remediation="No action required." if not saturated else "Reduce conversion load or increase worker capacity.",
        cause="The process is serving and its runtime identity is available." if not saturated else "The process is serving, but the conversion pool is saturated.",
        cause_confidence="high",
        actionability="info_only" if not saturated else "backend_probe",
    )


def check_shared_supabase_admin_connectivity(_settings: Settings) -> dict:
    try:
        get_supabase_admin().auth.admin.list_users(page=1, per_page=1)
        return _make_check(
            check_id="shared.supabase.admin_connectivity",
            category="connectivity",
            status="ok",
            label="Supabase admin connectivity",
            summary="Supabase admin connectivity is available.",
            evidence={"reachable": True},
            remediation="No action required.",
        )
    except Exception as exc:
        return _make_check(
            check_id="shared.supabase.admin_connectivity",
            category="connectivity",
            status="fail",
            label="Supabase admin connectivity",
            summary="Supabase admin connectivity is unavailable.",
            evidence={"reachable": False, "error_type": type(exc).__name__},
            remediation="Verify SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and Supabase availability.",
        )


def check_shared_background_workers_config(settings: Settings) -> dict:
    missing = []
    if not settings.supabase_url:
        missing.append("SUPABASE_URL")
    if not settings.supabase_service_role_key:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")

    workers_configured = len(missing) == 0
    return _make_check(
        check_id="shared.background_workers.config",
        category="config",
        status="ok" if workers_configured else "fail",
        label="Background workers config",
        summary="Background worker prerequisites are configured." if workers_configured else "Background worker prerequisites are missing.",
        evidence={"workers_configured": workers_configured, "missing": missing},
        remediation="No action required." if workers_configured else "Set the missing worker prerequisite environment variables.",
    )


def check_shared_observability_telemetry_config(settings: Settings) -> dict:
    telemetry_status = get_telemetry_status(settings)
    enabled = bool(telemetry_status.get("enabled"))
    return _make_check(
        check_id="shared.observability.telemetry_config",
        category="observability",
        status="ok" if enabled else "warn",
        label="Telemetry configuration",
        summary="OpenTelemetry is configured and enabled." if enabled else "OpenTelemetry is configured but disabled.",
        evidence={"enabled": enabled, "protocol": telemetry_status.get("protocol")},
        remediation="No action required." if enabled else "Enable OTEL_* settings if traces and metrics should be emitted.",
    )


def check_blockdata_storage_bucket_config(settings: Settings) -> dict:
    has_bucket = bool(settings.gcs_user_storage_bucket)
    return _make_check(
        check_id="blockdata.storage.bucket_config",
        category="config",
        status="ok" if has_bucket else "fail",
        label="Storage bucket config",
        summary="A GCS user-storage bucket is configured." if has_bucket else "GCS_USER_STORAGE_BUCKET is not configured.",
        evidence={
            "has_bucket": has_bucket,
            "bucket_name": settings.gcs_user_storage_bucket,
            "max_file_bytes": settings.user_storage_max_file_bytes,
            "cleanup_interval_seconds": settings.storage_cleanup_interval_seconds,
        },
        remediation="No action required." if has_bucket else "Set GCS_USER_STORAGE_BUCKET for upload flows.",
        cause="The runtime has an explicit user-storage bucket configured." if has_bucket else "The runtime has no user-storage bucket configured.",
        cause_confidence="high",
        verify_after=[] if has_bucket else [
            {
                "probe_kind": "readiness_check_verify",
                "label": "Refresh the readiness snapshot",
                "route": "/admin/runtime/readiness?surface=blockdata",
            }
        ],
        actionability="info_only" if has_bucket else "backend_action",
    )


def check_blockdata_storage_signed_url_signing(settings: Settings) -> dict:
    bucket_name = settings.gcs_user_storage_bucket
    if not bucket_name:
        return _make_check(
            check_id="blockdata.storage.signed_url_signing",
            category="credential",
            status="fail",
            label="Signed upload URL signing",
            summary="The server cannot sign upload URLs because no storage bucket is configured.",
            evidence={
                "has_bucket": False,
                "has_signing_credentials": False,
                "bucket_name": None,
                "credential_class": None,
                "service_account_email": None,
                "signing_mode": "unknown",
                "has_local_signer": False,
                "uses_iam_signblob": False,
                "has_access_token": False,
                "error_type": None,
                "error_status": None,
                "error_reason": "missing_bucket",
                "error_service": None,
                "error_method": None,
            },
            remediation="Configure GCS_USER_STORAGE_BUCKET before testing upload flows.",
            cause="The signing probe cannot run until a user-storage bucket is configured.",
            cause_confidence="high",
            verify_after=[
                {
                    "probe_kind": "storage_signed_upload",
                    "label": "Retry the signed upload URL probe",
                    "route": "/admin/runtime/readiness?surface=blockdata",
                }
            ],
            next_if_still_failing=[
                {
                    "step_kind": "manual_fix",
                    "label": "Set the runtime bucket configuration",
                    "description": "Configure GCS_USER_STORAGE_BUCKET for the platform-api process before re-running the signing probe.",
                }
            ],
            actionability="backend_action",
        )

    try:
        create_signed_upload_url(bucket_name, "runtime-readiness/probe.txt", "text/plain")
        return _make_check(
            check_id="blockdata.storage.signed_url_signing",
            category="credential",
            status="ok",
            label="Signed upload URL signing",
            summary="The server can generate GCS signed upload URLs.",
            evidence={
                "has_bucket": True,
                "has_signing_credentials": True,
                "error_type": None,
                "error_status": None,
                "error_reason": None,
                "error_service": None,
                "error_method": None,
                **_storage_signing_evidence(bucket_name),
            },
            remediation="No action required.",
            cause="The runtime can complete the configured signed upload URL flow.",
            cause_confidence="high",
            verify_after=[
                {
                    "probe_kind": "storage_signed_upload",
                    "label": "Retry the signed upload URL probe",
                    "route": "/admin/runtime/readiness?surface=blockdata",
                }
            ],
            actionability="info_only",
        )
    except AttributeError as exc:
        evidence = {
            "has_bucket": True,
            "has_signing_credentials": False,
            "error_type": type(exc).__name__,
            "error_status": None,
            "error_reason": "missing_private_key",
            "error_service": None,
            "error_method": None,
            **_storage_signing_evidence(bucket_name),
            "signing_mode": "local_private_key_required",
            "uses_iam_signblob": False,
        }
        return _make_check(
            check_id="blockdata.storage.signed_url_signing",
            category="credential",
            status="fail",
            label="Signed upload URL signing",
            summary="Current server credentials cannot sign a GCS upload URL because they do not include a private key.",
            evidence=evidence,
            remediation="Run platform-api with a service-account credential that can sign URLs.",
            cause="The active credential cannot sign URLs directly.",
            cause_confidence="high",
            verify_after=[
                {
                    "probe_kind": "storage_signed_upload",
                    "label": "Retry the signed upload URL probe",
                    "route": "/admin/runtime/readiness?surface=blockdata",
                }
            ],
            next_if_still_failing=[
                {
                    "step_kind": "manual_fix",
                    "label": "Inspect the runtime credential chain",
                    "description": "Verify whether the process is running with a signer-capable service account or key file.",
                }
            ],
            actionability="backend_action",
        )
    except Exception as exc:
        parsed = _parse_google_error_info(exc)
        evidence = {
            "has_bucket": True,
            "has_signing_credentials": False,
            "error_type": type(exc).__name__,
            **parsed,
            **_storage_signing_evidence(bucket_name),
        }
        cause = "Signed upload URL generation failed while calling the configured signing path."
        cause_confidence: Literal["high", "medium", "low"] | None = "medium"
        next_step = {
            "step_kind": "manual_fix",
            "label": "Inspect the runtime storage credentials",
            "description": "Verify GCS credentials and storage bucket access for the platform API process.",
        }
        if parsed.get("error_reason") == "ACCESS_TOKEN_SCOPE_INSUFFICIENT":
            evidence["signing_mode"] = "iam_signblob"
            evidence["uses_iam_signblob"] = True
            cause = "The runtime reached IAM signBlob, but the access token lacks the required OAuth scope."
            cause_confidence = "high"
            next_step = {
                "step_kind": "escalate",
                "label": "Escalate the runtime credential scope mismatch",
                "description": "Inspect the Cloud Run credential path and ensure IAM Credentials calls use a cloud-platform scoped access token.",
            }
        return _make_check(
            check_id="blockdata.storage.signed_url_signing",
            category="credential",
            status="fail",
            label="Signed upload URL signing",
            summary=f"Signed upload URL generation failed: {exc}",
            evidence=evidence,
            remediation="Verify GCS credentials and storage bucket access for the platform API process.",
            cause=cause,
            cause_confidence=cause_confidence,
            verify_after=[
                {
                    "probe_kind": "storage_signed_upload",
                    "label": "Retry the signed upload URL probe",
                    "route": "/admin/runtime/readiness?surface=blockdata",
                }
            ],
            next_if_still_failing=[next_step],
            actionability="backend_action",
        )


def check_blockdata_storage_bucket_cors(settings: Settings) -> dict:
    bucket_name = settings.gcs_user_storage_bucket
    if not bucket_name:
        return _make_check(
            check_id="blockdata.storage.bucket_cors",
            category="connectivity",
            status="fail",
            label="Bucket CORS",
            summary="Bucket CORS cannot be checked because no storage bucket is configured.",
            evidence={
                "cors_configured": False,
                "has_bucket": False,
                "bucket_name": None,
                "cors_rule_count": 0,
                "allowed_origins": [],
                "allowed_methods": [],
                "allowed_response_headers": [],
                "allows_upload_methods": False,
            },
            remediation="Configure GCS_USER_STORAGE_BUCKET before testing browser uploads.",
            cause="The CORS probe cannot run until a user-storage bucket is configured.",
            cause_confidence="high",
            verify_after=[
                {
                    "probe_kind": "readiness_check_verify",
                    "label": "Refresh the readiness snapshot",
                    "route": "/admin/runtime/readiness?surface=blockdata",
                }
            ],
            actionability="backend_action",
        )

    try:
        bucket = _gcs_client().bucket(bucket_name)
        reload_bucket = getattr(bucket, "reload", None)
        if callable(reload_bucket):
            try:
                reload_bucket(timeout=10)
            except TypeError:
                reload_bucket()
        cors_rules = list(getattr(bucket, "cors", None) or [])
        allowed_origins, allowed_methods, allowed_response_headers = _flatten_cors_rules(cors_rules)
        allows_upload_methods = any(
            any(str(method).upper() in {"PUT", "POST", "*"} for method in (rule.get("method") or []))
            for rule in cors_rules
            if isinstance(rule, dict)
        )
        cors_configured = bool(cors_rules) and allows_upload_methods
        return _make_check(
            check_id="blockdata.storage.bucket_cors",
            category="connectivity",
            status="ok" if cors_configured else "fail",
            label="Bucket CORS",
            summary="Bucket browser-upload CORS rules are configured." if cors_configured else "Bucket browser-upload CORS rules are missing or incomplete.",
            evidence={
                "cors_configured": cors_configured,
                "bucket_name": bucket_name,
                "cors_rule_count": len(cors_rules),
                "allowed_origins": allowed_origins,
                "allowed_methods": allowed_methods,
                "allowed_response_headers": allowed_response_headers,
                "allows_upload_methods": allows_upload_methods,
            },
            remediation="No action required." if cors_configured else "Apply browser upload CORS rules that allow PUT/POST to the bucket.",
            cause="The bucket exposes browser-upload CORS rules." if cors_configured else "The bucket has no browser-upload CORS rules.",
            cause_confidence="high",
            available_actions=[] if cors_configured else [
                {
                    "action_kind": "storage_browser_upload_cors_reconcile",
                    "label": "Reconcile bucket CORS policy",
                    "description": "Apply the checked-in browser upload CORS policy to the user-storage bucket.",
                    "route": "/admin/runtime/storage/browser-upload-cors/reconcile",
                    "requires_confirmation": True,
                }
            ],
            verify_after=[
                {
                    "probe_kind": "readiness_check_verify",
                    "label": "Refresh the readiness snapshot",
                    "route": "/admin/runtime/readiness?surface=blockdata",
                }
            ],
            next_if_still_failing=[] if cors_configured else [
                {
                    "step_kind": "inspect_dependency",
                    "label": "Inspect the live bucket policy",
                    "description": "Verify the live bucket CORS rules match the checked-in artifact.",
                }
            ],
            actionability="info_only" if cors_configured else "backend_action",
        )
    except Exception as exc:
        return _make_check(
            check_id="blockdata.storage.bucket_cors",
            category="connectivity",
            status="unknown",
            label="Bucket CORS",
            summary="Bucket CORS could not be evaluated safely.",
            evidence={
                "cors_configured": False,
                "bucket_name": bucket_name,
                "cors_rule_count": 0,
                "allowed_origins": [],
                "allowed_methods": [],
                "allowed_response_headers": [],
                "allows_upload_methods": False,
                "error_type": type(exc).__name__,
            },
            remediation="Verify bucket metadata access and rerun the readiness snapshot.",
            cause="The bucket metadata could not be inspected safely.",
            cause_confidence="medium",
            verify_after=[
                {
                    "probe_kind": "readiness_check_verify",
                    "label": "Refresh the readiness snapshot",
                    "route": "/admin/runtime/readiness?surface=blockdata",
                }
            ],
            actionability="backend_probe",
        )


def check_blockdata_pipeline_definitions(_settings: Settings) -> dict:
    try:
        definitions = list_pipeline_definitions()
        return _make_check(
            check_id="blockdata.pipeline.definitions",
            category="product",
            status="ok" if definitions else "fail",
            label="Pipeline definitions",
            summary="Pipeline definitions resolved from the current runtime." if definitions else "No pipeline definitions resolved from the current runtime.",
            evidence={"definition_count": len(definitions)},
            remediation="No action required." if definitions else "Verify pipeline registry definitions are loaded in platform-api.",
        )
    except Exception as exc:
        return _make_check(
            check_id="blockdata.pipeline.definitions",
            category="product",
            status="fail",
            label="Pipeline definitions",
            summary="Pipeline definitions could not be resolved from the current runtime.",
            evidence={"definition_count": 0, "error_type": type(exc).__name__},
            remediation="Verify pipeline registry imports and runtime dependencies.",
        )


def check_agchain_benchmarks_catalog(_settings: Settings, *, actor_id: str) -> dict:
    try:
        result = list_benchmarks(
            user_id=actor_id,
            project_id=None,
            search=None,
            state=None,
            validation_status=None,
            has_active_runs=None,
            limit=100,
            cursor=None,
            offset=0,
        )
        items = result.get("items") or []
        return _make_check(
            check_id="agchain.benchmarks.catalog",
            category="product",
            status="ok",
            label="Benchmarks catalog",
            summary="AGChain benchmark catalog seam resolved.",
            evidence={"catalog_count": len(items)},
            remediation="No action required.",
        )
    except Exception as exc:
        return _make_check(
            check_id="agchain.benchmarks.catalog",
            category="product",
            status="fail",
            label="Benchmarks catalog",
            summary="AGChain benchmark catalog seam failed to resolve.",
            evidence={"catalog_count": 0, "error_type": type(exc).__name__},
            remediation="Verify AGChain benchmark registry runtime dependencies.",
        )


def check_agchain_models_providers(_settings: Settings) -> dict:
    try:
        providers = list_supported_providers()
        return _make_check(
            check_id="agchain.models.providers",
            category="product",
            status="ok" if providers else "fail",
            label="Model providers",
            summary="AGChain model provider catalog resolved." if providers else "AGChain model provider catalog is empty.",
            evidence={"provider_count": len(providers)},
            remediation="No action required." if providers else "Verify AGChain provider catalog registration.",
        )
    except Exception as exc:
        return _make_check(
            check_id="agchain.models.providers",
            category="product",
            status="fail",
            label="Model providers",
            summary="AGChain model provider catalog failed to resolve.",
            evidence={"provider_count": 0, "error_type": type(exc).__name__},
            remediation="Verify AGChain provider catalog imports.",
        )


def check_agchain_models_targets(_settings: Settings, *, actor_id: str) -> dict:
    try:
        payload = list_model_targets(user_id=actor_id, limit=1, offset=0)
        return _make_check(
            check_id="agchain.models.targets",
            category="product",
            status="ok",
            label="Model targets",
            summary="AGChain model target listing seam resolved.",
            evidence={"total": payload.get("total", 0)},
            remediation="No action required.",
        )
    except Exception as exc:
        return _make_check(
            check_id="agchain.models.targets",
            category="product",
            status="fail",
            label="Model targets",
            summary="AGChain model target listing seam failed to resolve.",
            evidence={"total": 0, "error_type": type(exc).__name__},
            remediation="Verify AGChain model-target registry dependencies and Supabase connectivity.",
        )


def _execute_check(
    *,
    surface: SurfaceId,
    check_id: str,
    category: str,
    label: str,
    check_factory: CheckFactory,
    settings: Settings,
    actor_id: str,
) -> dict:
    started = perf_counter()
    try:
        with tracer.start_as_current_span("admin.runtime.readiness.check") as span:
            check = check_factory(settings, actor_id)
            duration_ms = (perf_counter() - started) * 1000.0
            set_span_attributes(
                span,
                {
                    "surface": surface,
                    "check.id": check["id"],
                    "check.category": check["category"],
                    "status": check["status"],
                },
            )
            record_runtime_readiness_check(
                surface=surface,
                check_id=check["id"],
                check_category=check["category"],
                status=check["status"],
                duration_ms=duration_ms,
            )
            return check
    except Exception as exc:
        logger.exception(
            "Runtime readiness check failed",
            extra={"surface": surface, "check_id": check_id},
        )
        return _make_unknown_check(
            check_id=check_id,
            category=category,
            label=label,
            exc=exc,
        )


def _surface_checks(surface: SurfaceId, settings: Settings, actor_id: str) -> list[dict]:
    registry: dict[SurfaceId, list[tuple[str, str, str, CheckFactory]]] = {
        "shared": [
            (
                "shared.platform_api.ready",
                "process",
                "Platform API readiness",
                lambda current_settings, _actor_id: check_shared_platform_api_ready(current_settings),
            ),
            (
                "shared.supabase.admin_connectivity",
                "connectivity",
                "Supabase admin connectivity",
                lambda current_settings, _actor_id: check_shared_supabase_admin_connectivity(current_settings),
            ),
            (
                "shared.background_workers.config",
                "config",
                "Background workers config",
                lambda current_settings, _actor_id: check_shared_background_workers_config(current_settings),
            ),
            (
                "shared.observability.telemetry_config",
                "observability",
                "Telemetry configuration",
                lambda current_settings, _actor_id: check_shared_observability_telemetry_config(current_settings),
            ),
        ],
        "blockdata": [
            (
                "blockdata.storage.bucket_config",
                "config",
                "Storage bucket config",
                lambda current_settings, _actor_id: check_blockdata_storage_bucket_config(current_settings),
            ),
            (
                "blockdata.storage.signed_url_signing",
                "credential",
                "Signed upload URL signing",
                lambda current_settings, _actor_id: check_blockdata_storage_signed_url_signing(current_settings),
            ),
            (
                "blockdata.storage.bucket_cors",
                "connectivity",
                "Bucket CORS",
                lambda current_settings, _actor_id: check_blockdata_storage_bucket_cors(current_settings),
            ),
            (
                "blockdata.pipeline.definitions",
                "product",
                "Pipeline definitions",
                lambda current_settings, _actor_id: check_blockdata_pipeline_definitions(current_settings),
            ),
        ],
        "agchain": [
            (
                "agchain.benchmarks.catalog",
                "product",
                "Benchmarks catalog",
                lambda current_settings, current_actor_id: check_agchain_benchmarks_catalog(current_settings, actor_id=current_actor_id),
            ),
            (
                "agchain.models.providers",
                "product",
                "Model providers",
                lambda current_settings, _actor_id: check_agchain_models_providers(current_settings),
            ),
            (
                "agchain.models.targets",
                "product",
                "Model targets",
                lambda current_settings, current_actor_id: check_agchain_models_targets(current_settings, actor_id=current_actor_id),
            ),
        ],
    }
    return [
        _execute_check(
            surface=surface,
            check_id=check_id,
            category=category,
            label=label,
            check_factory=check_factory,
            settings=settings,
            actor_id=actor_id,
        )
        for check_id, category, label, check_factory in registry[surface]
    ]


def get_runtime_readiness_snapshot(
    *,
    surface: Literal["all", "shared", "blockdata", "agchain"] = "all",
    actor_id: str,
) -> dict:
    settings = get_settings()
    surface_ids: list[SurfaceId] = ["shared", "blockdata", "agchain"] if surface == "all" else [surface]
    surfaces: list[dict] = []
    for surface_id in surface_ids:
        checks = _surface_checks(surface_id, settings, actor_id)
        surfaces.append(
            {
                "id": surface_id,
                "label": "Shared" if surface_id == "shared" else "BlockData" if surface_id == "blockdata" else "AGChain",
                "summary": _summary_from_checks(checks),
                "checks": checks,
            }
        )

    overall_summary = _summary_from_checks(
        [check for grouped_surface in surfaces for check in grouped_surface["checks"]]
    )
    return {
        "generated_at": _utc_now_iso(),
        "summary": overall_summary,
        "surfaces": surfaces,
    }
