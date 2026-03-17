from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlSettingRepository.java
# WARNING: Unresolved types: ApplicationContext

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_setting_repository import AbstractJdbcSettingRepository
from engine.repository.mysql.mysql_repository import MysqlRepository
from engine.core.models.setting import Setting


@dataclass(slots=True, kw_only=True)
class MysqlSettingRepository(AbstractJdbcSettingRepository):
    pass
