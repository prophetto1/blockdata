from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from app.api.routes.storage import _gcs_client
from app.core.config import Settings, get_settings
from app.services.runtime_readiness import _flatten_cors_rules

logger = logging.getLogger("platform-api.runtime-action-service")

ACTION_ID = "storage_browser_upload_cors_reconcile"
CHECK_ID = "blockdata.storage.bucket_cors"
CORS_POLICY_PATH = Path(__file__).resolve().parents[4] / "ops" / "gcs" / "user-storage-cors.json"


def _load_browser_upload_cors_policy() -> list[dict[str, Any]]:
    payload = json.loads(CORS_POLICY_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, list) or not all(isinstance(entry, dict) for entry in payload):
        raise RuntimeError("Browser upload CORS policy must be a JSON array of rule objects")
    return payload


def reconcile_storage_browser_upload_cors(
    *,
    actor_id: str,
    settings: Settings | None = None,
) -> dict[str, Any]:
    _ = actor_id
    current_settings = settings or get_settings()
    bucket_name = current_settings.gcs_user_storage_bucket
    if not bucket_name:
        raise RuntimeError("GCS_USER_STORAGE_BUCKET is not configured")

    try:
        cors_rules = _load_browser_upload_cors_policy()
        bucket = _gcs_client().bucket(bucket_name)
        bucket.cors = cors_rules

        persist_bucket = getattr(bucket, "patch", None) or getattr(bucket, "update", None)
        if not callable(persist_bucket):
            raise RuntimeError("Configured GCS bucket client cannot persist CORS changes")

        try:
            persist_bucket(timeout=10)
        except TypeError:
            persist_bucket()

        reload_bucket = getattr(bucket, "reload", None)
        if callable(reload_bucket):
            try:
                reload_bucket(timeout=10)
            except TypeError:
                reload_bucket()

        live_rules = list(getattr(bucket, "cors", None) or cors_rules)
        allowed_origins, allowed_methods, allowed_response_headers = _flatten_cors_rules(live_rules)
        result_payload = {
            "bucket_name": bucket_name,
            "cors_rule_count": len(live_rules),
            "allowed_origins": allowed_origins,
            "allowed_methods": allowed_methods,
            "allowed_response_headers": allowed_response_headers,
        }
        logger.info(
            "runtime_readiness_action",
            extra={
                "action_id": ACTION_ID,
                "check_id": CHECK_ID,
                "result": "success",
            },
        )
        return {
            "action_kind": ACTION_ID,
            "check_id": CHECK_ID,
            "result": "success",
            "result_payload": result_payload,
        }
    except Exception as exc:
        logger.exception(
            "runtime_readiness_action",
            extra={
                "action_id": ACTION_ID,
                "check_id": CHECK_ID,
                "result": "failure",
                "error_type": type(exc).__name__,
            },
        )
        raise
