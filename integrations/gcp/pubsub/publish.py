from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\pubsub\Publish.java
# WARNING: Unresolved types: Exception, From, core, io, kestra, models, property, tasks

from dataclasses import dataclass
from typing import Any

from integrations.gcp.pubsub.abstract_pub_sub import AbstractPubSub
from integrations.datagen.data import Data
from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Publish(AbstractPubSub):
    """Publish messages to Pub/Sub"""
    from: Any
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)

    def run(self, run_context: RunContext) -> Publish.Output:
        raise NotImplementedError  # TODO: translate from Java

    def check_for_ordering_keys(self, run_context: RunContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages_count: int | None = None
