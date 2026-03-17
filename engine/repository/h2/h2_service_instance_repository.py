from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2ServiceInstanceRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_service_instance_repository import AbstractJdbcServiceInstanceRepository
from engine.repository.h2.h2_repository import H2Repository
from engine.core.server.service_instance import ServiceInstance


@dataclass(slots=True, kw_only=True)
class H2ServiceInstanceRepository(AbstractJdbcServiceInstanceRepository):
    pass
