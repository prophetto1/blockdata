from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\excel\ExcelToIon.java
# WARNING: Unresolved types: Cell, Exception, IOException, Row, core, io, kestra, models, tasks

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.serdes.excel.date_time_render import DateTimeRender
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task
from integrations.serdes.excel.value_render import ValueRender


@dataclass(slots=True, kw_only=True)
class ExcelToIon(Task):
    """Convert an Excel file into ION."""
    from: Property[str]
    charset: Property[str] = Property.ofValue("UTF-8")
    value_render: Property[ValueRender] = Property.ofValue(ValueRender.UNFORMATTED_VALUE)
    date_time_render: Property[DateTimeRender] = Property.ofValue(DateTimeRender.UNFORMATTED_VALUE)
    header: Property[bool] = Property.ofValue(true)
    skip_empty_rows: Property[bool] = Property.ofValue(false)
    skip_rows: int = 0
    sheets_title: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_converted_sheet(self, sheet_raw_data: list[Any], headers: list[Any]) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def process_row(self, row: Row, first_col: int, last_col: int, value_render: ValueRender, skip_empty_rows_value: bool, date_time_render: DateTimeRender) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def extract_cell_value(self, cell: Cell, value_render: ValueRender, date_time_render: DateTimeRender) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_formula(self, cell: Cell, date_time_render: DateTimeRender) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_formatted_value(self, cell: Cell, date_time_render: DateTimeRender) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_unformatted_value(self, cell: Cell, date_time_render: DateTimeRender) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def convert_numeric(self, cell: Cell, date_time_render: DateTimeRender) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def store(self, run_context: RunContext, values: list[Any]) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uris: dict[str, str] | None = None
        size: int | None = None
