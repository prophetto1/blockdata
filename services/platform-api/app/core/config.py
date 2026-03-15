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


@dataclass(frozen=True)
class Settings:
    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    platform_api_m2m_token: str = ""
    conversion_service_key: str = ""  # backward compat alias
    log_level: str = "INFO"

    @classmethod
    def from_env(cls) -> "Settings":
        m2m = os.environ.get("PLATFORM_API_M2M_TOKEN", "")
        conv_key = os.environ.get("CONVERSION_SERVICE_KEY", "")
        return cls(
            supabase_url=_env_or_none("SUPABASE_URL"),
            supabase_service_role_key=_env_or_none("SUPABASE_SERVICE_ROLE_KEY"),
            platform_api_m2m_token=m2m or conv_key,
            conversion_service_key=conv_key or m2m,
            log_level=os.environ.get("LOG_LEVEL", "INFO"),
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()
