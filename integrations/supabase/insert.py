from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.supabase.abstract_supabase import AbstractSupabase
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Insert(AbstractSupabase, RunnableTask, io):
    """Insert rows into a Supabase table"""
    table: Property[str]
    data: Any
    select: Property[str] | None = None
    on_conflict: Property[str] | None = None
    resolution: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_from(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None
        code: int | None = None
        headers: dict[String, List[String]] | None = None
        inserted_rows: list[Map[String, Object]] | None = None
        inserted_count: int | None = None
        raw_response: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
    code: int | None = None
    headers: dict[String, List[String]] | None = None
    inserted_rows: list[Map[String, Object]] | None = None
    inserted_count: int | None = None
    raw_response: str | None = None
