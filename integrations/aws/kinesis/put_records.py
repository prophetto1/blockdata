from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\kinesis\PutRecords.java
# WARNING: Unresolved types: Exception, IOException, ObjectMapper, PutRecordsResponse, URISyntaxException, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar, Optional

from integrations.aws.kinesis.abstract_kinesis import AbstractKinesis
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from integrations.aws.kinesis.model.record import Record
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class PutRecords(AbstractKinesis):
    """Put records to Kinesis Data Streams"""
    records: Any
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofIon()
        .setSerializationInclusion(JsonInclude.Include.ALWAYS)
    fail_on_unsuccessful_records: Property[bool] = Property.ofValue(true)
    stream_name: Property[str] | None = None
    stream_arn: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def put_records(self, run_context: RunContext, records: list[Record]) -> PutRecordsResponse:
        raise NotImplementedError  # TODO: translate from Java

    def get_record_list(self, records: Any, run_context: RunContext) -> list[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def write_output_file(self, run_context: RunContext, put_records_response: PutRecordsResponse, records: list[Record]) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        failed_records_count: int | None = None
        record_count: int | None = None

        def final_state(self) -> Optional[State.Type]:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class OutputEntry:
        sequence_number: str | None = None
        shard_id: str | None = None
        error_code: str | None = None
        error_message: str | None = None
        record: Record | None = None
