from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\InstanceService.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.setting import Setting
from engine.core.repositories.setting_repository_interface import SettingRepositoryInterface


@dataclass(slots=True, kw_only=True)
class InstanceService:
    setting_repository: SettingRepositoryInterface | None = None
    instance_id_setting: Setting | None = None

    def fetch(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_instance_uuid(self) -> Setting:
        raise NotImplementedError  # TODO: translate from Java
