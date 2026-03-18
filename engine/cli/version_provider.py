from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\VersionProvider.java
# WARNING: Unresolved types: CommandLine, IVersionProvider

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class VersionProvider:

    def get_version(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java
