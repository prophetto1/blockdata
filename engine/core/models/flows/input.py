from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\Input.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.input.array_input import ArrayInput
from engine.core.models.flows.input.bool_input import BoolInput
from engine.core.models.flows.input.boolean_input import BooleanInput
from engine.core.models.flows.data import Data
from engine.core.models.flows.input.date_input import DateInput
from engine.core.models.flows.input.date_time_input import DateTimeInput
from engine.core.models.flows.depends_on import DependsOn
from engine.core.models.flows.input.duration_input import DurationInput
from engine.core.models.flows.input.email_input import EmailInput
from engine.core.models.flows.input.enum_input import EnumInput
from engine.core.models.flows.input.file_input import FileInput
from engine.core.models.flows.input.float_input import FloatInput
from engine.core.models.flows.input.int_input import IntInput
from engine.core.models.flows.input.json_input import JsonInput
from engine.core.models.flows.input.multiselect_input import MultiselectInput
from engine.core.models.flows.input.secret_input import SecretInput
from engine.core.models.flows.input.select_input import SelectInput
from engine.core.models.flows.input.string_input import StringInput
from engine.core.models.flows.input.time_input import TimeInput
from engine.core.models.flows.type import Type
from engine.core.models.flows.input.uri_input import URIInput
from engine.core.models.flows.input.yaml_input import YamlInput


@dataclass(slots=True, kw_only=True)
class Input(ABC):
    id: str
    type: Type
    required: bool = True
    name: str | None = None
    description: str | None = None
    depends_on: DependsOn | None = None
    defaults: Property[T] | None = None
    prefill: Property[T] | None = None
    display_name: str | None = None

    @abstractmethod
    def validate(self, input: T) -> None:
        ...
