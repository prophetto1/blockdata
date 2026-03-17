from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\collectors\ServiceUsage.java

from dataclasses import dataclass
from datetime import date
from datetime import datetime
from datetime import timedelta
from typing import Any

from engine.core.server.service_instance import ServiceInstance
from engine.core.repositories.service_instance_repository_interface import ServiceInstanceRepositoryInterface
from engine.core.server.service_type import ServiceType


@dataclass(slots=True, kw_only=True)
class ServiceUsage:
    daily_statistics: list[DailyServiceStatistics] | None = None

    @staticmethod
    def of(from: datetime, to: datetime, repository: ServiceInstanceRepositoryInterface, interval: timedelta) -> ServiceUsage:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(from: datetime, to: datetime, repository: ServiceInstanceRepositoryInterface, service_type: ServiceType, interval: timedelta) -> DailyServiceStatistics:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(service_type: ServiceType, interval: timedelta, instances: list[ServiceInstance]) -> DailyServiceStatistics:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class DailyServiceStatistics:
        type: str | None = None
        values: list[DailyStatistics] | None = None

    @dataclass(slots=True)
    class DailyStatistics:
        date: date | None = None
        min: int | None = None
        max: int | None = None
        avg: int | None = None
