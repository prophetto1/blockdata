"""Execution context — replaces Kestra's RunContext."""

import logging
import os
import re
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ExecutionContext:
    """
    Provides template rendering, logging, and service access to plugins.
    Equivalent to Kestra's RunContext.
    """

    execution_id: str = ""
    task_run_id: str = ""
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
        """
        Render Kestra-style {{ expression }} templates.

        Supports dotted paths: {{ outputs.task1.value }}
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
        """Fetch a secret from Supabase vault. Placeholder for now."""
        return os.environ.get(key, "")

    async def upload_file(self, bucket: str, path: str, content: bytes) -> str:
        """Upload to Supabase Storage. Returns public URL. Placeholder for now."""
        return f"{self.supabase_url}/storage/v1/object/public/{bucket}/{path}"
