"""Traced from Java imports in all 7 MongoDB task files:

  import io.kestra.core.models.tasks.RunnableTask;      → BasePlugin
  import io.kestra.core.models.tasks.Task;               → BasePlugin (base)
  import io.kestra.core.models.tasks.Output;             → PluginOutput
  import io.kestra.core.runners.RunContext;               → ExecutionContext
  import io.kestra.core.models.property.Property;         → context.render()
  import io.kestra.core.models.annotations.PluginProperty → (not needed in Python)
  import io.kestra.core.models.annotations.Plugin         → task_types list
  import io.kestra.core.models.annotations.Example        → (docstrings)
  import io.kestra.core.models.annotations.Metric         → (deferred)
  import io.kestra.core.models.executions.metrics.Counter  → (deferred)
  import io.swagger.v3.oas.annotations.media.Schema       → (not needed)
  import lombok.*                                          → (not needed)
  import jakarta.validation.constraints.NotNull             → (runtime checks)
"""
from __future__ import annotations

import logging
import os
import tempfile
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# io.kestra.core.models.tasks.Output → PluginOutput
# ---------------------------------------------------------------------------

@dataclass
class PluginOutput:
    """Every plugin returns this. Maps to Kestra's Output interface.

    Output.java:
      - Optional<State.Type> finalState()  → state field
      - Map<String, Object> toMap()        → data dict
    """
    data: dict[str, Any] = field(default_factory=dict)
    state: str = "SUCCESS"  # SUCCESS | FAILED | WARNING
    logs: list[str] = field(default_factory=list)


def success(data: dict[str, Any] | None = None, logs: list[str] | None = None) -> PluginOutput:
    return PluginOutput(data=data or {}, state="SUCCESS", logs=logs or [])


def failed(message: str, data: dict[str, Any] | None = None) -> PluginOutput:
    return PluginOutput(data=data or {}, state="FAILED", logs=[message])


# ---------------------------------------------------------------------------
# io.kestra.core.runners.RunContext → ExecutionContext
# ---------------------------------------------------------------------------

@dataclass
class ExecutionContext:
    """Every plugin receives this. Maps to Kestra's RunContext.

    RunContext provides 17 service categories. This covers the ones
    that MongoDB (and most RunnableTask plugins) actually call:

      runContext.render(String)        → self.render(template)
      runContext.logger()              → self.logger
      runContext.storage().putFile()   → self.upload_file()
      runContext.storage().getFile()   → self.download_file()
      runContext.workingDir()          → self.work_dir
      runContext.metric()              → (deferred)
      runContext.decrypt()             → (handled by connection resolver)
    """
    execution_id: str = ""
    task_run_id: str = ""
    user_id: str = ""
    variables: dict[str, Any] = field(default_factory=dict)
    supabase_url: str = ""
    supabase_key: str = ""
    logger: logging.Logger = field(default_factory=lambda: logging.getLogger("plugin"))

    def __post_init__(self):
        if not self.supabase_url:
            self.supabase_url = os.environ.get("SUPABASE_URL", "")
        if not self.supabase_key:
            self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    # --- RunContext.render() ---

    def render(self, template: str) -> str:
        """RunContext.render(String) → Jinja2 rendering.

        Kestra uses Pebble templates. BD uses Jinja2.
        Both resolve {{ expression }} syntax.
        """
        if not isinstance(template, str):
            return str(template)
        if "{{" not in template and "{%" not in template:
            return template
        try:
            from jinja2 import Environment, Undefined

            class _PreserveUndefined(Undefined):
                def __str__(self):
                    return "{{ " + self._undefined_name + " }}"
                def __iter__(self):
                    return iter([])
                def __bool__(self):
                    return False

            env = Environment(undefined=_PreserveUndefined)
            return env.from_string(template).render(**self.variables)
        except Exception:
            return template

    # --- RunContext.storage().putFile() ---

    async def upload_file(self, bucket: str, path: str, content: bytes) -> str:
        """RunContext.storage().putFile(File) → upload bytes, return URI."""
        if self.supabase_url and self.supabase_key:
            from .storage import upload_to_storage
            return await upload_to_storage(self.supabase_url, self.supabase_key, bucket, path, content)
        # Local fallback for testing
        out = Path(tempfile.gettempdir()) / bucket / path
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(content)
        return str(out)

    # --- RunContext.storage().getFile() ---

    async def download_file(self, uri: str) -> bytes:
        """RunContext.storage().getFile(URI) → download bytes."""
        if uri.startswith(("http://", "https://")):
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.get(uri, timeout=120)
                resp.raise_for_status()
                return resp.content
        if self.supabase_url and self.supabase_key and not Path(uri).exists():
            from .storage import download_from_storage
            bucket, _, path = uri.partition("/")
            return await download_from_storage(self.supabase_url, self.supabase_key, bucket, path)
        return Path(uri).read_bytes()

    # --- RunContext.workingDir() ---

    _work_dir: tempfile.TemporaryDirectory | None = field(default=None, repr=False)

    @property
    def work_dir(self) -> Path:
        """RunContext.workingDir().path() → temp directory."""
        if self._work_dir is None:
            prefix = f"bd-{self.execution_id[:8]}-" if self.execution_id else "bd-"
            self._work_dir = tempfile.TemporaryDirectory(prefix=prefix, ignore_cleanup_errors=True)
        return Path(self._work_dir.name)

    def create_temp_file(self, suffix: str = ".tmp") -> Path:
        """RunContext.workingDir().createTempFile(extension)"""
        fd, path_str = tempfile.mkstemp(suffix=suffix, dir=self.work_dir)
        os.close(fd)
        return Path(path_str)

    def cleanup(self) -> None:
        """RunContext.cleanup()"""
        if self._work_dir is not None:
            self._work_dir.cleanup()
            self._work_dir = None


# ---------------------------------------------------------------------------
# io.kestra.core.models.tasks.RunnableTask<T extends Output> → BasePlugin
# ---------------------------------------------------------------------------

class BasePlugin(ABC):
    """Every plugin implements this. Maps to Kestra's RunnableTask<Output>.

    RunnableTask.java:
      T run(RunContext runContext) throws Exception;

    BasePlugin:
      async def run(self, params: dict, context: ExecutionContext) -> PluginOutput
    """
    task_types: list[str] = []

    @abstractmethod
    async def run(self, params: dict[str, Any], context: ExecutionContext) -> PluginOutput:
        ...

    async def test_connection(self, creds: dict[str, Any]) -> PluginOutput:
        return success(data={"valid": True})
