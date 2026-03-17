from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-anthropic\src\main\java\io\kestra\plugin\anthropic\AbstractAnthropic.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractAnthropic(ABC, Task):
    api_key: Property[str]
    model: Property[str]
    max_tokens: Property[int] = Property.ofValue(1024L)
    temperature: Property[@Max(1) Double] = Property.ofValue(1.0)
    top_p: Property[float] | None = None
    top_k: Property[int] | None = None

    def send_metrics(self, run_context: RunContext, message: Message) -> None:
        raise NotImplementedError  # TODO: translate from Java
