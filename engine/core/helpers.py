from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\Helpers.java
# WARNING: Unresolved types: EmbeddedServer, URISyntaxException

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, ClassVar


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
    def application_context(properties: dict[str, Any] | None = None, envs: list[str] | None = None) -> ApplicationContext:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def run_application_context(env: list[str], properties: dict[str, Any] | None = None, consumer: Callable[ApplicationContext, EmbeddedServer] | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java
