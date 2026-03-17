from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.googleworkspace.sheets.abstract_sheet import AbstractSheet
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


class Format(str, Enum):
    ION = "ION"
    CSV = "CSV"
    AVRO = "AVRO"
    PARQUET = "PARQUET"
    ORC = "ORC"
    JSON = "JSON"


@dataclass(slots=True, kw_only=True)
class AbstractLoad(AbstractSheet):
    j_s_o_n__m_a_p_p_e_r: ObjectMapper | None = None
    i_o_n__m_a_p_p_e_r: ObjectMapper | None = None
    spreadsheet_id: Property[str]
    header: Property[bool] | None = None
    csv_options: CsvOptions | None = None
    avro_schema: Property[str] | None = None
    format: Property[Format] | None = None

    def parse(self, run_context: RunContext, from: str) -> list[List[Object]]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CsvOptions:
        field_delimiter: Property[str] | None = None
        skip_leading_rows: Property[int] | None = None
        quote: Property[str] | None = None
        encoding: Property[str] | None = None


@dataclass(slots=True, kw_only=True)
class CsvOptions:
    field_delimiter: Property[str] | None = None
    skip_leading_rows: Property[int] | None = None
    quote: Property[str] | None = None
    encoding: Property[str] | None = None
