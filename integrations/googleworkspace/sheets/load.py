from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.opensearch.abstract_load import AbstractLoad
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class InsertType(str, Enum):
    UPDATE = "UPDATE"
    OVERWRITE = "OVERWRITE"
    APPEND = "APPEND"


@dataclass(slots=True, kw_only=True)
class Load(AbstractLoad, RunnableTask):
    """Load data from file into Google Sheets"""
    v_a_l_u_e__i_n_p_u_t__o_p_t_i_o_n: str | None = None
    from: Property[str] | None = None
    range: Property[str] | None = None
    insert_type: Property[InsertType] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def execute_write(self, service: Sheets, spreadsheet_id: str, range: str, body: ValueRange, mode: InsertType) -> WriteResult:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        range: str | None = None
        rows: int | None = None
        columns: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    range: str | None = None
    rows: int | None = None
    columns: int | None = None
