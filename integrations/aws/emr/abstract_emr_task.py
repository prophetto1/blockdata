from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\emr\AbstractEmrTask.java
# WARNING: Unresolved types: EmrClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractEmrTask(ABC, AbstractConnection):

    def client(self, run_context: RunContext) -> EmrClient:
        raise NotImplementedError  # TODO: translate from Java

    def emr_client(self, run_context: RunContext) -> EmrClient:
        raise NotImplementedError  # TODO: translate from Java
