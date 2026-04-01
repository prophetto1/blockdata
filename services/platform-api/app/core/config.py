"""Centralized configuration from environment variables."""

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional


def _env_or_none(name: str) -> Optional[str]:
    value = os.environ.get(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _env_csv(name: str) -> tuple[str, ...]:
    value = os.environ.get(name)
    if value is None:
        return ()

    parts = [part.strip() for part in value.split(",")]
    return tuple(part for part in parts if part)


def _parse_otlp_headers(raw: str | None) -> dict[str, str] | None:
    """Parse ``OTEL_EXPORTER_OTLP_HEADERS`` into a dict.

    Rules (from the approved OTel contract plan):
    - ``None`` or empty/whitespace-only → ``None`` (unset).
    - Comma-delimited ``key=value`` pairs; whitespace trimmed around keys
      and values.
    - Empty keys are invalid → ``ValueError``.
    - Duplicate keys are rejected → ``ValueError``.
    - Segments without exactly one ``=`` are malformed → ``ValueError``.
    """
    if raw is None:
        return None
    raw = raw.strip()
    if not raw:
        return None

    result: dict[str, str] = {}
    for segment in raw.split(","):
        segment = segment.strip()
        if not segment:
            continue
        if "=" not in segment:
            raise ValueError(
                f"Malformed OTLP header segment (missing '='): {segment!r}"
            )
        key, _, value = segment.partition("=")
        key = key.strip()
        value = value.strip()
        if not key:
            raise ValueError("Empty key in OTEL_EXPORTER_OTLP_HEADERS")
        if key in result:
            raise ValueError(
                f"Duplicate key {key!r} in OTEL_EXPORTER_OTLP_HEADERS"
            )
        result[key] = value
    return result if result else None


@dataclass(frozen=True)
class Settings:
    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    app_secret_envelope_key: Optional[str] = None
    platform_api_m2m_token: str = ""
    conversion_service_key: str = ""  # backward compat alias
    log_level: str = "INFO"
    gcs_user_storage_bucket: Optional[str] = None
    user_storage_max_file_bytes: int = 1073741824  # 1 GB
    storage_cleanup_interval_seconds: int = 300
    auth_redirect_origins: tuple[str, ...] = ()
    # OpenTelemetry settings
    otel_enabled: bool = False
    otel_service_name: str = "platform-api"
    otel_service_namespace: str = "blockdata"
    otel_deployment_env: str = "local"
    otel_exporter_otlp_endpoint: str = "http://localhost:4318"
    otel_exporter_otlp_protocol: str = "http/protobuf"
    otel_exporter_otlp_headers: dict[str, str] | None = None
    otel_traces_sampler: str = "parentbased_traceidratio"
    otel_traces_sampler_arg: float = 1.0
    otel_log_correlation: bool = True
    otel_metrics_enabled: bool = True
    otel_logs_enabled: bool = True
    signoz_ui_url: str = "http://localhost:8080"
    jaeger_ui_url: str = "http://localhost:16686"
    agchain_operations_worker_enabled: bool = False
    agchain_operations_worker_poll_interval_seconds: int = 5
    agchain_operations_worker_batch_size: int = 5
    agchain_operations_worker_lease_seconds: int = 60
    agchain_dataset_preview_sync_threshold: int = 200
    agchain_dataset_materialization_sync_threshold: int = 200

    @classmethod
    def from_env(cls) -> "Settings":
        m2m = os.environ.get("PLATFORM_API_M2M_TOKEN", "")
        conv_key = os.environ.get("CONVERSION_SERVICE_KEY", "")
        return cls(
            supabase_url=_env_or_none("SUPABASE_URL"),
            supabase_service_role_key=_env_or_none("SUPABASE_SERVICE_ROLE_KEY"),
            app_secret_envelope_key=_env_or_none("APP_SECRET_ENVELOPE_KEY"),
            platform_api_m2m_token=m2m or conv_key,
            conversion_service_key=conv_key or m2m,
            log_level=os.environ.get("LOG_LEVEL", "INFO"),
            gcs_user_storage_bucket=_env_or_none("GCS_USER_STORAGE_BUCKET"),
            user_storage_max_file_bytes=int(os.environ.get("USER_STORAGE_MAX_FILE_BYTES", "1073741824")),
            storage_cleanup_interval_seconds=int(os.environ.get("STORAGE_CLEANUP_INTERVAL_SECONDS", "300")),
            auth_redirect_origins=_env_csv("AUTH_REDIRECT_ORIGINS"),
            otel_enabled=_env_bool("OTEL_ENABLED", False),
            otel_service_name=os.environ.get("OTEL_SERVICE_NAME", "platform-api"),
            otel_service_namespace=os.environ.get("OTEL_SERVICE_NAMESPACE", "blockdata"),
            otel_deployment_env=os.environ.get("OTEL_DEPLOYMENT_ENV", "local"),
            otel_exporter_otlp_endpoint=os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"),
            otel_exporter_otlp_protocol=os.environ.get("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf"),
            otel_exporter_otlp_headers=_parse_otlp_headers(os.environ.get("OTEL_EXPORTER_OTLP_HEADERS")),
            otel_traces_sampler=os.environ.get("OTEL_TRACES_SAMPLER", "parentbased_traceidratio"),
            otel_traces_sampler_arg=float(os.environ.get("OTEL_TRACES_SAMPLER_ARG", "1.0")),
            otel_log_correlation=_env_bool("OTEL_LOG_CORRELATION", True),
            otel_metrics_enabled=_env_bool("OTEL_METRICS_ENABLED", True),
            otel_logs_enabled=_env_bool("OTEL_LOGS_ENABLED", True),
            signoz_ui_url=os.environ.get("SIGNOZ_UI_URL", "http://localhost:8080"),
            # Keep JAEGER_UI_URL as a compatibility alias for one migration pass.
            jaeger_ui_url=os.environ.get("JAEGER_UI_URL", "http://localhost:16686"),
            agchain_operations_worker_enabled=_env_bool("AGCHAIN_OPERATIONS_WORKER_ENABLED", False),
            agchain_operations_worker_poll_interval_seconds=int(
                os.environ.get("AGCHAIN_OPERATIONS_WORKER_POLL_INTERVAL_SECONDS", "5")
            ),
            agchain_operations_worker_batch_size=int(
                os.environ.get("AGCHAIN_OPERATIONS_WORKER_BATCH_SIZE", "5")
            ),
            agchain_operations_worker_lease_seconds=int(
                os.environ.get("AGCHAIN_OPERATIONS_WORKER_LEASE_SECONDS", "60")
            ),
            agchain_dataset_preview_sync_threshold=int(
                os.environ.get("AGCHAIN_DATASET_PREVIEW_SYNC_THRESHOLD", "200")
            ),
            agchain_dataset_materialization_sync_threshold=int(
                os.environ.get("AGCHAIN_DATASET_MATERIALIZATION_SYNC_THRESHOLD", "200")
            ),
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()
