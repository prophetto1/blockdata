from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.kubernetes.abstract_connection import AbstractConnection
from engine.core.runners.run_context import RunContext


class IteratorType(str, Enum):
    AT_SEQUENCE_NUMBER = "AT_SEQUENCE_NUMBER"
    AFTER_SEQUENCE_NUMBER = "AFTER_SEQUENCE_NUMBER"
    TRIM_HORIZON = "TRIM_HORIZON"
    LATEST = "LATEST"
    AT_TIMESTAMP = "AT_TIMESTAMP"


@dataclass(slots=True, kw_only=True)
class AbstractKinesis(AbstractConnection):
    """Shared Kinesis connection"""

    def async_client(self, run_context: RunContext) -> KinesisAsyncClient:
        raise NotImplementedError  # TODO: translate from Java

    def client(self, run_context: RunContext) -> KinesisClient:
        raise NotImplementedError  # TODO: translate from Java
