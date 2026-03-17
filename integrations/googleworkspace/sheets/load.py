from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\sheets\Load.java
# WARNING: Unresolved types: Exception, Sheets, ValueRange, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from integrations.elasticsearch.abstract_load import AbstractLoad
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Load(AbstractLoad):
    """Load data from file into Google Sheets"""
    v_a_l_u_e__i_n_p_u_t__o_p_t_i_o_n: ClassVar[str] = "RAW"
    range: Property[str] = Property.ofValue("Sheet1")
    insert_type: Property[InsertType] = Property.ofValue(InsertType.UPDATE)
    from: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def execute_write(service: Sheets, spreadsheet_id: str, range: str, body: ValueRange, mode: InsertType) -> WriteResult:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class WriteResult:
        range: str | None = None
        rows: int | None = None
        columns: int | None = None

    class InsertType(str, Enum):
        UPDATE = "UPDATE"
        OVERWRITE = "OVERWRITE"
        APPEND = "APPEND"

    @dataclass(slots=True)
    class Output:
        range: str | None = None
        rows: int | None = None
        columns: int | None = None
