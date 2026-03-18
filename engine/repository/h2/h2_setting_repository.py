from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2SettingRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_setting_repository import AbstractJdbcSettingRepository
from engine.repository.h2.h2_repository import H2Repository
from engine.core.models.setting import Setting


@dataclass(slots=True, kw_only=True)
class H2SettingRepository(AbstractJdbcSettingRepository):
    pass
