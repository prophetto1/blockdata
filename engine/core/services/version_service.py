from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\VersionService.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar, Optional

from engine.core.repositories.setting_repository_interface import SettingRepositoryInterface
from engine.core.utils.version_provider import VersionProvider


@dataclass(slots=True, kw_only=True)
class VersionService:
    logger: ClassVar[Logger] = getLogger(__name__)
    setting_repository: SettingRepositoryInterface | None = None
    version_provider: VersionProvider | None = None

    def get_instance_version(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def maybe_save_or_update_instance_version(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
