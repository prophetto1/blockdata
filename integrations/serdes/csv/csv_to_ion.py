from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.serdes.on_bad_lines import OnBadLines
from engine.core.models.property.property import Property
from integrations.pulsar.reader import Reader
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class CsvToIon(Task, RunnableTask):
    """Convert a CSV file into ION."""
    d_e_f_a_u_l_t__m_a_x__b_u_f_f_e_r__s_i_z_e: int | None = None
    d_e_f_a_u_l_t__m_a_x__f_i_e_l_d__s_i_z_e: int | None = None
    from: Property[str]
    header: Property[bool] | None = None
    field_separator: Property[Character] | None = None
    text_delimiter: Property[Character] | None = None
    skip_empty_rows: Property[bool] | None = None
    error_on_different_field_count: Property[bool] | None = None
    on_bad_lines: Property[OnBadLines] | None = None
    skip_rows: Property[int] | None = None
    charset: Property[str] | None = None
    max_buffer_size: Property[int] | None = None
    allow_extra_chars_after_closing_quote: Property[bool] | None = None
    max_field_size: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def csv_reader(self, reader: Reader, run_context: RunContext) -> CsvReader[CsvRecord]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
