from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\EditionProvider.java

from dataclasses import dataclass
from typing import Any

from engine.core.repositories.setting_repository_interface import SettingRepositoryInterface


@dataclass(slots=True, kw_only=True)
class EditionProvider:
    setting_repository: Optional[SettingRepositoryInterface] | None = None

    def get(self) -> Edition:
        raise NotImplementedError  # TODO: translate from Java

    def start(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def persist_edition(self, setting_repository_interface: SettingRepositoryInterface, edition: Edition) -> None:
        raise NotImplementedError  # TODO: translate from Java

    class Edition(str, Enum):
        OSS = "OSS"
        EE = "EE"
