from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\csv\CsvToIon.java
# WARNING: Unresolved types: CsvReader, CsvRecord, Exception, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.serdes.on_bad_lines import OnBadLines
from engine.core.models.property.property import Property
from integrations.pulsar.reader import Reader
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class CsvToIon(Task):
    """Convert a CSV file into ION."""
    from: Property[str]
    d_e_f_a_u_l_t__m_a_x__b_u_f_f_e_r__s_i_z_e: ClassVar[int] = 16 * 1024 * 1024
    d_e_f_a_u_l_t__m_a_x__f_i_e_l_d__s_i_z_e: ClassVar[int] = 16 * 1024 * 1024
    header: Property[bool] = Property.ofValue(true)
    field_separator: Property[char] = Property.ofValue(',')
    text_delimiter: Property[char] = Property.ofValue('"')
    skip_empty_rows: Property[bool] = Property.ofValue(false)
    on_bad_lines: Property[OnBadLines] = Property.ofValue(OnBadLines.ERROR)
    skip_rows: Property[int] = Property.ofValue(0)
    charset: Property[str] = Property.ofValue(StandardCharsets.UTF_8.name())
    max_buffer_size: Property[int] = Property.ofValue(DEFAULT_MAX_BUFFER_SIZE)
    allow_extra_chars_after_closing_quote: Property[bool] = Property.ofValue(false)
    max_field_size: Property[int] = Property.ofValue(DEFAULT_MAX_FIELD_SIZE)
    error_on_different_field_count: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def csv_reader(self, reader: Reader, run_context: RunContext) -> CsvReader[CsvRecord]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
