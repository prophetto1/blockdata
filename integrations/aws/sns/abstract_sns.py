from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\sns\AbstractSns.java
# WARNING: Unresolved types: SnsClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractSns(ABC, AbstractConnection):
    """Shared SNS connection"""
    topic_arn: Property[str]

    def client(self, run_context: RunContext) -> SnsClient:
        raise NotImplementedError  # TODO: translate from Java
