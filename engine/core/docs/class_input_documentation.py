from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\docs\ClassInputDocumentation.java

from dataclasses import dataclass
from typing import Any

from engine.core.docs.abstract_class_documentation import AbstractClassDocumentation
from engine.core.models.flows.input import Input
from engine.core.docs.json_schema_generator import JsonSchemaGenerator


@dataclass(slots=True, kw_only=True)
class ClassInputDocumentation(AbstractClassDocumentation):

    @staticmethod
    def of(json_schema_generator: JsonSchemaGenerator, cls: type[Any]) -> ClassInputDocumentation:
        raise NotImplementedError  # TODO: translate from Java
