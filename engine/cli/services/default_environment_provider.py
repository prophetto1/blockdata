from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\services\DefaultEnvironmentProvider.java

from dataclasses import dataclass
from typing import Any

from engine.cli.services.environment_provider import EnvironmentProvider


@dataclass(slots=True, kw_only=True)
class DefaultEnvironmentProvider:

    def get_cli_environments(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java
