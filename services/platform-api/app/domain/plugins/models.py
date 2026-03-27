"""Plugin system models — base class, output, context."""

import logging
import os
import re
import tempfile
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from opentelemetry import metrics, trace
from pydantic import BaseModel, Field

from app.infra.crypto import decrypt_with_fallback
from app.observability.otel import safe_attributes

tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)
secrets_resolve_counter = meter.create_counter("platform.secrets.resolve.count")


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
        """Render Jinja2/Kestra-style {{ expression }} templates.

        Supports:
        - Variable substitution: {{ outputs.task1.value }}
        - Filters: {{ name | upper }}, {{ items | join(",") }}
        - Conditions: {% if active %}yes{% else %}no{% endif %}
        - Loops: {% for x in items %}{{ x }}{% endfor %}
        - Nested dict access via dot notation (Jinja2 native)
        - Unresolved variables are preserved as-is: {{ unknown }} stays as {{ unknown }}
        """
        if not isinstance(template, str):
            return str(template)
        if "{{" not in template and "{%" not in template:
            return template
        try:
            from jinja2 import Environment, Undefined

            class _PreserveUndefined(Undefined):
                """Render undefined variables back as {{ name }} instead of empty string."""
                def __str__(self):
                    return "{{ " + self._undefined_name + " }}"
                def __iter__(self):
                    return iter([])
                def __bool__(self):
                    return False

            env = Environment(undefined=_PreserveUndefined)
            tmpl = env.from_string(template)
            return tmpl.render(**self.variables)
        except Exception:
            return template

    def _resolve(self, dotted_path: str) -> Any:
        """Resolve a dotted path like 'outputs.task1.value' against variables.

        Kept for backward compatibility and direct programmatic access
        to nested variables outside of templates.
        """
        parts = dotted_path.split(".")
        current: Any = self.variables
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return None
        return current

    async def get_secret(self, key: str) -> str:
        """Fetch a user-scoped secret value, falling back to env vars."""
        normalized_name = key.strip().upper()

        with tracer.start_as_current_span("secrets.resolve") as span:
            if self.user_id and self.supabase_url and self.supabase_key:
                from supabase import create_client

                sb = create_client(self.supabase_url, self.supabase_key)
                result = (
                    sb.table("user_variables")
                    .select("value_encrypted")
                    .eq("user_id", self.user_id)
                    .eq("name", normalized_name)
                    .limit(1)
                    .execute()
                )
                row = (result.data or [None])[0]
                if row and row.get("value_encrypted"):
                    attrs = {
                        "caller": "platform-api",
                        "resolution_source": "user_secret",
                        "result": "hit",
                    }
                    for attr_key, attr_value in safe_attributes(attrs).items():
                        span.set_attribute(attr_key, attr_value)
                    secrets_resolve_counter.add(1, safe_attributes(attrs))
                    return decrypt_with_fallback(
                        row["value_encrypted"], "user-variables-v1"
                    )

            value = os.environ.get(normalized_name, "")
            attrs = {
                "caller": "platform-api",
                "resolution_source": "env" if value else "miss",
                "result": "hit" if value else "miss",
            }
            for attr_key, attr_value in safe_attributes(attrs).items():
                span.set_attribute(attr_key, attr_value)
            secrets_resolve_counter.add(1, safe_attributes(attrs))
            return value

    async def upload_file(self, bucket: str, path: str, content: bytes) -> str:
        """Upload to Supabase Storage. Returns public URL.

        Uses the real storage helper for actual HTTP uploads in production.
        """
        from app.infra.storage import upload_to_storage
        return await upload_to_storage(
            self.supabase_url, self.supabase_key, bucket, path, content
        )

    async def download_file(self, uri: str) -> bytes:
        """Download an artifact from a URL or bucket/path reference.

        Accepts:
        - Full URLs (http:// or https://) — fetched directly
        - Bucket/path strings (e.g. "pipeline/artifacts/file.jsonl") — fetched from Supabase Storage
        """
        if uri.startswith(("http://", "https://")):
            import httpx as _httpx
            async with _httpx.AsyncClient() as client:
                resp = await client.get(uri, timeout=120)
                resp.raise_for_status()
                return resp.content
        from app.infra.storage import download_from_storage
        bucket, _, path = uri.partition("/")
        return await download_from_storage(
            self.supabase_url, self.supabase_key, bucket, path
        )

    async def list_files(self, bucket: str, prefix: str) -> list[dict]:
        """List files in a storage bucket by prefix."""
        from app.infra.storage import list_storage
        return await list_storage(
            self.supabase_url, self.supabase_key, bucket, prefix
        )

    async def delete_files(self, bucket: str, paths: list[str]) -> None:
        """Delete files from a storage bucket."""
        from app.infra.storage import delete_from_storage
        await delete_from_storage(
            self.supabase_url, self.supabase_key, bucket, paths
        )

    # --- Temp file management ---

    _work_dir: tempfile.TemporaryDirectory | None = field(default=None, repr=False)

    @property
    def work_dir(self) -> Path:
        """Lazily create and return the execution's working directory.

        Uses stdlib TemporaryDirectory — automatically handles cleanup.
        """
        if self._work_dir is None:
            prefix = f"bd-{self.execution_id[:8]}-" if self.execution_id else "bd-"
            self._work_dir = tempfile.TemporaryDirectory(
                prefix=prefix, ignore_cleanup_errors=True
            )
        return Path(self._work_dir.name)

    def create_temp_file(self, suffix: str = ".tmp") -> Path:
        """Create a temp file in the execution's working directory.

        Returns the Path to an empty file. Caller writes to it.
        Cleaned up automatically when cleanup() is called.
        """
        fd, path_str = tempfile.mkstemp(suffix=suffix, dir=self.work_dir)
        os.close(fd)
        return Path(path_str)

    def cleanup(self) -> None:
        """Delete all temp files created during this execution.

        Safe to call multiple times.
        """
        if self._work_dir is not None:
            self._work_dir.cleanup()
            self._work_dir = None


def success(data: dict[str, Any] | None = None, logs: list[str] | None = None) -> PluginOutput:
    return PluginOutput(data=data or {}, state="SUCCESS", logs=logs or [])


def failed(message: str, data: dict[str, Any] | None = None) -> PluginOutput:
    return PluginOutput(data=data or {}, state="FAILED", logs=[message])


def warning(message: str, data: dict[str, Any] | None = None) -> PluginOutput:
    return PluginOutput(data=data or {}, state="WARNING", logs=[message])
