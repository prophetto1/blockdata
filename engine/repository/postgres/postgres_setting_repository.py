from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresSettingRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_setting_repository import AbstractJdbcSettingRepository
from engine.repository.postgres.postgres_repository import PostgresRepository
from engine.core.models.setting import Setting


@dataclass(slots=True, kw_only=True)
class PostgresSettingRepository(AbstractJdbcSettingRepository):
    pass
