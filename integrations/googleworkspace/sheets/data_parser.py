from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\sheets\DataParser.java
# WARNING: Unresolved types: CSVFormat, ColumnVector, CsvOptions, IOException, InputStream, ObjectMapper

from dataclasses import dataclass
from typing import Any

from integrations.elasticsearch.abstract_load import AbstractLoad
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class DataParser:
    run_context: RunContext | None = None

    def parse_csv(self, input_stream: InputStream, csv_options: AbstractLoad.CsvOptions) -> list[list[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_through_mapper(self, input_stream: InputStream, mapper: ObjectMapper, include_headers: bool) -> list[list[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_avro(self, input_stream: InputStream, include_headers: bool, avro_schema: str) -> list[list[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_parquet(self, input_stream: InputStream, include_headers: bool) -> list[list[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_o_r_c(self, input_stream: InputStream, include_headers: bool) -> list[list[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def get_value(self, vector: ColumnVector, row: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_csv_format(self, csv_options: AbstractLoad.CsvOptions) -> CSVFormat:
        raise NotImplementedError  # TODO: translate from Java
