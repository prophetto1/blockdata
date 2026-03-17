from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\spi\PebbleSafeTemplateFactory.java
# WARNING: Unresolved types: PromptTemplateFactory

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.flows.input import Input
from engine.core.models.templates.template import Template


@dataclass(slots=True, kw_only=True)
class PebbleSafeTemplateFactory:

    def create(self, input: Input) -> Template:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PebbleSafeTemplate:
        variable_pattern: ClassVar[re.Pattern]
        template: str | None = None

        @staticmethod
        def extract_variables(template: str) -> set[str]:
            raise NotImplementedError  # TODO: translate from Java

        def render(self, variables: dict[str, Any]) -> str:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def replace_all(template: str, variable: str, value: Any) -> str:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def in_ai_var_brackets(variable: str) -> str:
            raise NotImplementedError  # TODO: translate from Java
