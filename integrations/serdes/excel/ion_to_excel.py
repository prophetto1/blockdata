from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\excel\IonToExcel.java
# WARNING: Unresolved types: CellStyle, Exception, From, SXSSFRow, SXSSFWorkbook, Sheet, Workbook, core, io, kestra, models, tasks

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.serdes.abstract_text_writer import AbstractTextWriter
from integrations.datagen.data import Data
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class IonToExcel(AbstractTextWriter):
    """Convert an ION file into Excel."""
    from: Any
    charset: Property[str] = Property.ofValue("UTF-8")
    sheets_title: Property[str] = Property.ofValue("Sheet")
    header: Property[bool] = Property.ofValue(true)
    styles: Property[bool] = Property.ofValue(true)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def write_query(self, run_context: RunContext, title: str, from: str, temp_file: Path, workbook: SXSSFWorkbook) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def create_cell(self, workbook: Workbook, sheet: Sheet, value: Any, xssf_row: SXSSFRow, row_number: int, styles: bool, rendered_time_zone_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_cell_style(self, workbook: Workbook) -> CellStyle:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        size: int | None = None
