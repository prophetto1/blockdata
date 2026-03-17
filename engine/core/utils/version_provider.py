from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\VersionProvider.java
# WARNING: Unresolved types: Environment, PropertySource

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional


@dataclass(slots=True, kw_only=True)
class VersionProvider:
    version: str = "Snapshot"
    revision: str | None = None
    date: datetime | None = None
    environment: Environment | None = None

    def start(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def load_version(self, build_properties: Optional[PropertySource], git_properties: Optional[PropertySource]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def load_revision(self, git_properties: Optional[PropertySource]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def load_time(self, git_properties: Optional[PropertySource]) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def get_version(self, object: Any) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java
