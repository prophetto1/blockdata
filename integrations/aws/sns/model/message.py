from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\sns\model\Message.java
# WARNING: Unresolved types: Builder, PublishRequest

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Message:
    data: str
    group_id: str | None = None
    deduplication_id: str | None = None
    subject: str | None = None
    phone_number: str | None = None
    structure: str | None = None

    def to(self, builder: PublishRequest.Builder, run_context: RunContext) -> PublishRequest:
        raise NotImplementedError  # TODO: translate from Java
