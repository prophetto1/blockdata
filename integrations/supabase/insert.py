from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-supabase\src\main\java\io\kestra\plugin\supabase\Insert.java
# WARNING: Unresolved types: Exception, From, core, io, kestra, models, property, tasks

from dataclasses import dataclass
from typing import Any

from integrations.supabase.abstract_supabase import AbstractSupabase
from integrations.datagen.data import Data
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Insert(AbstractSupabase):
    """Insert rows into a Supabase table"""
    table: Property[str]
    data: Any
    resolution: Property[str] = Property.ofValue("merge-duplicates")
    select: Property[str] | None = None
    on_conflict: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_from(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        code: int | None = None
        headers: dict[str, list[str]] | None = None
        inserted_rows: list[dict[str, Any]] | None = None
        inserted_count: int | None = None
        raw_response: str | None = None
