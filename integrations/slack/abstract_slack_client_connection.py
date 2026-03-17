from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\AbstractSlackClientConnection.java
# WARNING: Unresolved types: Exception, FunctionChecked, MethodsClient, R, SlackApiTextResponse

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.utils.rethrow import Rethrow
from engine.core.runners.run_context import RunContext
from integrations.singer.taps.slack import Slack
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractSlackClientConnection(ABC, Task):
    token: Property[str]
    slack: Slack | None = None

    def client(self, run_context: RunContext) -> MethodsClient:
        raise NotImplementedError  # TODO: translate from Java

    def call(self, run_context: RunContext, call: Rethrow.FunctionChecked[MethodsClient, R, Exception]) -> R:
        raise NotImplementedError  # TODO: translate from Java
