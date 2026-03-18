from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\sqs\Consume.java
# WARNING: Unresolved types: AtomicInteger, Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.aws.sqs.abstract_sqs import AbstractSqs
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Consume(AbstractSqs):
    """Consume messages from SQS"""
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    auto_delete: Property[bool] = Property.ofValue(true)
    visibility_timeout: Property[int] = Property.ofValue(30)
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def ended(self, count: AtomicInteger, start: datetime, run_context: RunContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int | None = None
        uri: str | None = None
