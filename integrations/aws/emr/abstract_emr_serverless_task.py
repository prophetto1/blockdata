from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\emr\AbstractEmrServerlessTask.java
# WARNING: Unresolved types: EmrServerlessClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractEmrServerlessTask(ABC, AbstractConnection):

    def client(self, run_context: RunContext) -> EmrServerlessClient:
        raise NotImplementedError  # TODO: translate from Java
