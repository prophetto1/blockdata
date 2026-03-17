from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlServiceInstanceRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_service_instance_repository import AbstractJdbcServiceInstanceRepository
from engine.repository.mysql.mysql_repository import MysqlRepository
from engine.core.server.service_instance import ServiceInstance


@dataclass(slots=True, kw_only=True)
class MysqlServiceInstanceRepository(AbstractJdbcServiceInstanceRepository):
    pass
