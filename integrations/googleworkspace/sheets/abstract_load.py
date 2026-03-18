from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\sheets\AbstractLoad.java
# WARNING: Unresolved types: Exception, ObjectMapper

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from integrations.googleworkspace.sheets.abstract_sheet import AbstractSheet
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractLoad(ABC, AbstractSheet):
    spreadsheet_id: Property[str]
    j_s_o_n__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    i_o_n__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofIon()
    header: Property[bool] = Property.ofValue(false)
    csv_options: CsvOptions = CsvOptions.builder().build()
    avro_schema: Property[str] | None = None
    format: Property[Format] | None = None

    def parse(self, run_context: RunContext, from: str) -> list[list[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    class Format(str, Enum):
        ION = "ION"
        CSV = "CSV"
        AVRO = "AVRO"
        PARQUET = "PARQUET"
        ORC = "ORC"
        JSON = "JSON"

    @dataclass(slots=True)
    class CsvOptions:
        field_delimiter: Property[str] = Property.ofValue(",")
        encoding: Property[str] = Property.ofValue("UTF-8")
        skip_leading_rows: Property[int] | None = None
        quote: Property[str] | None = None
