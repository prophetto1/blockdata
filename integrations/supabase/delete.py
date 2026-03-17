from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.supabase.abstract_supabase import AbstractSupabase
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractSupabase, RunnableTask):
    """Delete rows from a Supabase table"""
    table: Property[str]
    filter: Property[str]
    select: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None
        code: int | None = None
        headers: dict[String, List[String]] | None = None
        deleted_rows: list[Map[String, Object]] | None = None
        deleted_count: int | None = None
        raw_response: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
    code: int | None = None
    headers: dict[String, List[String]] | None = None
    deleted_rows: list[Map[String, Object]] | None = None
    deleted_count: int | None = None
    raw_response: str | None = None
