from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\sns\Publish.java
# WARNING: Unresolved types: Exception, From, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.aws.sns.abstract_sns import AbstractSns
from integrations.datagen.data import Data
from integrations.amqp.models.message import Message
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Publish(AbstractSns):
    """Publish messages to an SNS topic"""
    from: Any

    def run(self, run_context: RunContext) -> Publish.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages_count: int | None = None
