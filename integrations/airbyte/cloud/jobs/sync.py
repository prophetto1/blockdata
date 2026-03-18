from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\cloud\jobs\Sync.java
# WARNING: Unresolved types: JobTypeEnum

from dataclasses import dataclass
from typing import Any

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger


@dataclass(slots=True, kw_only=True)
class Sync(AbstractTrigger):
    """Sync an Airbyte Cloud job."""

    def sync_type(self) -> JobTypeEnum:
        raise NotImplementedError  # TODO: translate from Java
