from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\metrics\GlobalTagsConfigurer.java
# WARNING: Unresolved types: MeterRegistryConfigurer, SimpleMeterRegistry

from dataclasses import dataclass
from typing import Any

from engine.core.metrics.metric_config import MetricConfig
from engine.core.models.server_type import ServerType


@dataclass(slots=True, kw_only=True)
class GlobalTagsConfigurer:
    metric_config: MetricConfig | None = None
    server_type: ServerType | None = None

    def configure(self, meter_registry: SimpleMeterRegistry) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def supports(self, meter_registry: SimpleMeterRegistry) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_type(self) -> type[SimpleMeterRegistry]:
        raise NotImplementedError  # TODO: translate from Java
