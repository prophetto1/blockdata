from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\kinesis\AbstractKinesis.java
# WARNING: Unresolved types: Exception, KinesisAsyncClient, KinesisClient

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractKinesis(AbstractConnection):
    """Shared Kinesis connection"""

    def async_client(self, run_context: RunContext) -> KinesisAsyncClient:
        raise NotImplementedError  # TODO: translate from Java

    def client(self, run_context: RunContext) -> KinesisClient:
        raise NotImplementedError  # TODO: translate from Java

    class IteratorType(str, Enum):
        AT_SEQUENCE_NUMBER = "AT_SEQUENCE_NUMBER"
        AFTER_SEQUENCE_NUMBER = "AFTER_SEQUENCE_NUMBER"
        TRIM_HORIZON = "TRIM_HORIZON"
        LATEST = "LATEST"
        AT_TIMESTAMP = "AT_TIMESTAMP"
