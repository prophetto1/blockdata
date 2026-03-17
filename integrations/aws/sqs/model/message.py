from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\sqs\model\Message.java
# WARNING: Unresolved types: Builder, SendMessageRequest, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Message:
    data: str
    group_id: str | None = None
    deduplication_id: str | None = None
    delay_seconds: int | None = None

    def to(self, builder: SendMessageRequest.Builder, run_context: RunContext) -> SendMessageRequest:
        raise NotImplementedError  # TODO: translate from Java
