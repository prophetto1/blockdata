from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\cosmosdb\PartitionKeyDefinition.java
# WARNING: Unresolved types: PartitionKeyDefinitionVersion, PartitionKind, azure, com, cosmos, models

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class PartitionKeyDefinition:
    paths: list[str] | None = None
    kind: PartitionKind | None = None
    version: PartitionKeyDefinitionVersion | None = None

    def to_azure_partition_key_definition(self) -> com.azure.cosmos.models.PartitionKeyDefinition:
        raise NotImplementedError  # TODO: translate from Java
