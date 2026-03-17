from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\pubsub\Consume.java
# WARNING: Unresolved types: AtomicInteger, Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.gcp.pubsub.abstract_pub_sub import AbstractPubSub
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Consume(AbstractPubSub):
    """Consume messages from Pub/Sub"""
    subscription: Property[str]
    auto_create_subscription: Property[bool] = Property.ofValue(true)
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
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
