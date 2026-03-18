from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunContextCache.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class RunContextCache:
    global_vars: dict[Any, Any] = None
    env_vars: dict[str, str] = None
    redacted_env_var: list[str] | None = None
    application_context: ApplicationContext | None = None

    def init(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def env_variables(self, env_prefix: str) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java
