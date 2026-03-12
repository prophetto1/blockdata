"""Centralized configuration from environment variables."""

import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    platform_api_m2m_token: str = ""
    conversion_service_key: str = ""  # backward compat alias
    log_level: str = "INFO"
    onlyoffice_jwt_secret: str = ""
    onlyoffice_storage_dir: str = ""
    onlyoffice_bridge_url: str = ""
    onlyoffice_docserver_url: str = ""
    onlyoffice_docserver_internal_url: str = ""

    @classmethod
    def from_env(cls) -> "Settings":
        m2m = os.environ.get("PLATFORM_API_M2M_TOKEN", "")
        conv_key = os.environ.get("CONVERSION_SERVICE_KEY", "")
        return cls(
            supabase_url=os.environ.get("SUPABASE_URL", ""),
            supabase_service_role_key=os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
            platform_api_m2m_token=m2m or conv_key,
            conversion_service_key=conv_key or m2m,
            log_level=os.environ.get("LOG_LEVEL", "INFO"),
            onlyoffice_jwt_secret=os.environ.get("ONLYOFFICE_JWT_SECRET", "my-jwt-secret-change-me"),
            onlyoffice_storage_dir=os.environ.get("ONLYOFFICE_STORAGE_DIR", "/app/cache/onlyoffice"),
            onlyoffice_bridge_url=os.environ.get("ONLYOFFICE_BRIDGE_URL", "http://host.docker.internal:8000"),
            onlyoffice_docserver_url=os.environ.get("ONLYOFFICE_DOCSERVER_URL", "http://localhost:9980"),
            onlyoffice_docserver_internal_url=os.environ.get("ONLYOFFICE_DOCSERVER_INTERNAL_URL", "http://localhost:9980"),
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()
