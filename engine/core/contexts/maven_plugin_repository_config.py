from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\contexts\MavenPluginRepositoryConfig.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class MavenPluginRepositoryConfig:
    id: str | None = None
    url: str | None = None
    basic_auth: BasicAuth | None = None

    @dataclass(slots=True)
    class BasicAuth:
        username: str | None = None
        password: str | None = None
