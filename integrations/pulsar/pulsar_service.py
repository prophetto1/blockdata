from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\PulsarService.java
# WARNING: Unresolved types: IOException, PulsarClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.pulsar.pulsar_connection_interface import PulsarConnectionInterface
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PulsarService(ABC):

    @staticmethod
    def decode_base64(run_context: RunContext, value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def client(pulsar_connection_interface: PulsarConnectionInterface, run_context: RunContext) -> PulsarClient:
        raise NotImplementedError  # TODO: translate from Java
