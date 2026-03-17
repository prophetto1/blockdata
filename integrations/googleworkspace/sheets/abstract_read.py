from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\sheets\AbstractRead.java
# WARNING: Unresolved types: IOException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any

from integrations.googleworkspace.sheets.abstract_sheet import AbstractSheet
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractRead(ABC, AbstractSheet):
    """Read data from a Google Sheet"""
    spreadsheet_id: Property[str]
    value_render: Property[ValueRender] = Property.ofValue(ValueRender.UNFORMATTED_VALUE)
    date_time_render: Property[DateTimeRender] = Property.ofValue(DateTimeRender.FORMATTED_STRING)
    header: Property[bool] = Property.ofValue(true)
    fetch: Property[bool] = Property.ofValue(false)
    store: Property[bool] = Property.ofValue(true)

    def transform(self, values: list[list[Any]], run_context: RunContext) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def store(self, run_context: RunContext, values: list[Any]) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    class ValueRender(str, Enum):
        FORMATTED_VALUE = "FORMATTED_VALUE"
        UNFORMATTED_VALUE = "UNFORMATTED_VALUE"
        FORMULA = "FORMULA"

    class DateTimeRender(str, Enum):
        SERIAL_NUMBER = "SERIAL_NUMBER"
        FORMATTED_STRING = "FORMATTED_STRING"
