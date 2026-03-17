from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\InputOutputValidationException.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.input import Input
from engine.core.exceptions.kestra_runtime_exception import KestraRuntimeException
from engine.core.models.flows.output import Output


@dataclass(slots=True, kw_only=True)
class InputOutputValidationException(KestraRuntimeException):

    @staticmethod
    def of(message: str, input: Input[Any]) -> InputOutputValidationException:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(message: str, output: Output) -> InputOutputValidationException:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(message: str) -> InputOutputValidationException:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def merge(exceptions: set[InputOutputValidationException]) -> InputOutputValidationException:
        raise NotImplementedError  # TODO: translate from Java
