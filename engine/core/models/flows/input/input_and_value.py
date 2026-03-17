from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\InputAndValue.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.input import Input
from engine.core.exceptions.input_output_validation_exception import InputOutputValidationException


@dataclass(slots=True, kw_only=True)
class InputAndValue:
    input: Input[Any] | None = None
    value: Any | None = None
    enabled: bool | None = None
    is_default: bool | None = None
    exceptions: set[InputOutputValidationException] | None = None
