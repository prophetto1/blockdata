from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\pubsub\model\Message.java
# WARNING: Unresolved types: IOException, PubsubMessage

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.runners.run_context import RunContext
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Message:
    data: Any | None = None
    attributes: dict[str, str] | None = None
    message_id: str | None = None
    ordering_key: str | None = None

    def to(self, run_context: RunContext, serde_type: SerdeType) -> PubsubMessage:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(message: PubsubMessage, serde_type: SerdeType) -> Message:
        raise NotImplementedError  # TODO: translate from Java
