from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-supabase\src\main\java\io\kestra\plugin\supabase\Update.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.supabase.abstract_supabase import AbstractSupabase
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Update(AbstractSupabase):
    """Update rows in a Supabase table"""
    table: Property[str]
    data: Property[dict[str, Any]]
    filter: Property[str]
    select: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        code: int | None = None
        headers: dict[str, list[str]] | None = None
        updated_rows: list[dict[str, Any]] | None = None
        updated_count: int | None = None
        raw_response: str | None = None
