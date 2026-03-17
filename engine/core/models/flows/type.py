from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\Type.java

from enum import Enum
from typing import Any

from engine.core.models.flows.input.array_input import ArrayInput
from engine.core.models.flows.input.bool_input import BoolInput
from engine.core.models.flows.input.boolean_input import BooleanInput
from engine.core.models.flows.input.date_input import DateInput
from engine.core.models.flows.input.date_time_input import DateTimeInput
from engine.core.models.flows.input.duration_input import DurationInput
from engine.core.models.flows.input.email_input import EmailInput
from engine.core.models.flows.input.enum_input import EnumInput
from engine.core.models.flows.input.file_input import FileInput
from engine.core.models.flows.input.float_input import FloatInput
from engine.core.models.flows.input import Input
from engine.core.models.flows.input.int_input import IntInput
from engine.core.models.flows.input.json_input import JsonInput
from engine.core.models.flows.input.multiselect_input import MultiselectInput
from engine.core.models.flows.input.secret_input import SecretInput
from engine.core.models.flows.input.select_input import SelectInput
from engine.core.models.flows.input.string_input import StringInput
from engine.core.models.flows.input.time_input import TimeInput
from engine.core.models.flows.input.uri_input import URIInput
from engine.core.models.flows.input.yaml_input import YamlInput


class Type(str, Enum):
    STRING = "STRING"
    ENUM = "ENUM"
    SELECT = "SELECT"
    INT = "INT"
    FLOAT = "FLOAT"
    BOOLEAN = "BOOLEAN"
    BOOL = "BOOL"
    DATETIME = "DATETIME"
    DATE = "DATE"
    TIME = "TIME"
    DURATION = "DURATION"
    FILE = "FILE"
    JSON = "JSON"
    URI = "URI"
    SECRET = "SECRET"
    ARRAY = "ARRAY"
    MULTISELECT = "MULTISELECT"
    YAML = "YAML"
    EMAIL = "EMAIL"
