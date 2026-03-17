from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\kinesis\Consume.java
# WARNING: Unresolved types: Exception, IteratorType, KinesisClient, Shard, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.aws.kinesis.abstract_kinesis import AbstractKinesis
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Consume(AbstractKinesis):
    """Consume records from Kinesis"""
    stream_name: Property[str]
    iterator_type: Property[IteratorType] = Property.ofValue(IteratorType.LATEST)
    max_records: Property[int] = Property.ofValue(1000)
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(30))
    poll_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(1))
    starting_sequence_number: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_shard_iterator(self, run_context: RunContext, client: KinesisClient, stream: str, shard: Shard) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ConsumedRecord:
        data: str | None = None
        partition_key: str | None = None
        sequence_number: str | None = None
        shard_id: str | None = None
        approximate_arrival_timestamp: datetime | None = None

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        count: int | None = None
        last_sequence_per_shard: dict[str, str] | None = None
