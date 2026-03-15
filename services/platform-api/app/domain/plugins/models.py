"""Plugin system models — base class, output, context."""

import logging
import os
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel, Field


class PluginOutput(BaseModel):
    """Standardized output from every plugin execution."""
    data: dict[str, Any] = Field(default_factory=dict)
    state: str = "SUCCESS"  # SUCCESS | FAILED | WARNING
    logs: list[str] = Field(default_factory=list)


class PluginParam(BaseModel):
    """Schema for a single plugin parameter."""
    name: str
    type: str
    required: bool = False
    default: Any = None
    description: str = ""
    values: list[str] | None = None


class BasePlugin(ABC):
    """Every plugin implements this. Maps to Kestra's RunnableTask<Output>."""
    task_types: list[str] = []
    credential_schema: list[dict] = []

    @abstractmethod
    async def run(self, params: dict[str, Any], context: "ExecutionContext") -> PluginOutput:
        ...

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return []

    async def test_connection(self, creds: dict[str, Any]) -> PluginOutput:
        """Test whether the given credentials can reach the service.

        Plugins override this with real connectivity checks.
        Default implementation returns success.
        """
        return success(data={"valid": True})


@dataclass
class ExecutionContext:
    """Provides template rendering, logging, and service access to plugins.

    Faithful port of pipeline-worker/app/shared/context.py.
    All methods preserve the same signatures and behavior.
    """
    execution_id: str = ""
    task_run_id: str = ""
    user_id: str = ""          # authenticated user — set by route, used by connection resolver
    variables: dict[str, Any] = field(default_factory=dict)
    supabase_url: str = ""
    supabase_key: str = ""
    logger: logging.Logger = field(default_factory=lambda: logging.getLogger("plugin"))

    def __post_init__(self):
        if not self.supabase_url:
            self.supabase_url = os.environ.get("SUPABASE_URL", "")
        if not self.supabase_key:
            self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    def render(self, template: str) -> str:
        """Render Kestra-style {{ expression }} templates.

        Supports dotted paths: {{ outputs.task1.value }}
        Unresolved expressions are preserved as-is.
        """
        if not isinstance(template, str):
            return str(template)

        def replace_expr(match: re.Match) -> str:
            expr = match.group(1).strip()
            value = self._resolve(expr)
            return str(value) if value is not None else match.group(0)

        return re.sub(r"\{\{\s*(.+?)\s*\}\}", replace_expr, template)

    def _resolve(self, dotted_path: str) -> Any:
        """Resolve a dotted path like 'outputs.task1.value' against variables."""
        parts = dotted_path.split(".")
        current: Any = self.variables
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return None
        return current

    async def get_secret(self, key: str) -> str:
        """Fetch a secret value. Currently reads from env vars."""
        return os.environ.get(key, "")

    async def upload_file(self, bucket: str, path: str, content: bytes) -> str:
        """Upload to Supabase Storage. Returns public URL.

        Uses the real storage helper for actual HTTP uploads in production.
        """
        from app.infra.storage import upload_to_storage
        return await upload_to_storage(
            self.supabase_url, self.supabase_key, bucket, path, content
        )


def success(data: dict[str, Any] | None = None, logs: list[str] | None = None) -> PluginOutput:
    return PluginOutput(data=data or {}, state="SUCCESS", logs=logs or [])


def failed(message: str, data: dict[str, Any] | None = None) -> PluginOutput:
    return PluginOutput(data=data or {}, state="FAILED", logs=[message])


def warning(message: str, data: dict[str, Any] | None = None) -> PluginOutput:
    return PluginOutput(data=data or {}, state="WARNING", logs=[message])
