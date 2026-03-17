from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\cloudwatch\AbstractCloudWatch.java
# WARNING: Unresolved types: CloudWatchClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractCloudWatch(ABC, AbstractConnection):
    """Shared CloudWatch connection"""

    def client(self, run_context: RunContext) -> CloudWatchClient:
        raise NotImplementedError  # TODO: translate from Java
