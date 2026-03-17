from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\Helpers.java
# WARNING: Unresolved types: ApplicationContext, BiConsumer, Consumer, EmbeddedServer, URISyntaxException

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class Helpers:
    flows_count: ClassVar[int]
    plugins: ClassVar[Path]

    @staticmethod
    def load_external_plugins_from_classpath() -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def count_flows() -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def application_context() -> ApplicationContext:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def application_context(properties: dict[str, Any]) -> ApplicationContext:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def application_context(properties: dict[str, Any], envs: list[str]) -> ApplicationContext:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def run_application_context(consumer: Consumer[ApplicationContext]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def run_application_context(consumer: BiConsumer[ApplicationContext, EmbeddedServer]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def run_application_context(env: list[str], properties: dict[str, Any], consumer: BiConsumer[ApplicationContext, EmbeddedServer]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def run_application_context(env: list[str], consumer: BiConsumer[ApplicationContext, EmbeddedServer]) -> None:
        raise NotImplementedError  # TODO: translate from Java
