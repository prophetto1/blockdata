from __future__ import annotations

# Source: E:\KESTRA\repository-memory\src\main\java\io\kestra\runner\memory\DatasourceProvider.java
# WARNING: Unresolved types: DatasourceConfiguration, FlywayConfigurationProperties

from dataclasses import dataclass
from typing import Any

from engine.core.models.conditions.condition_context import ConditionContext


@dataclass(slots=True, kw_only=True)
class DatasourceProvider:

    def get_datasource_configuration(self) -> CustomDatasourceConfiguration:
        raise NotImplementedError  # TODO: translate from Java

    def get_flyway_configuration(self) -> CustomFlywayConfiguration:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CustomDatasourceConfiguration(DatasourceConfiguration):
        pass

    @dataclass(slots=True)
    class CustomFlywayConfiguration(FlywayConfigurationProperties):
        pass

    @dataclass(slots=True)
    class H2RepositoryOrQueue:

        def matches(self, context: ConditionContext) -> bool:
            raise NotImplementedError  # TODO: translate from Java
