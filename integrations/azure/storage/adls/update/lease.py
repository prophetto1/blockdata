from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\adls\update\Lease.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.azure.storage.adls.abstracts.abstract_data_lake_with_file import AbstractDataLakeWithFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Lease(AbstractDataLakeWithFile):
    """Lease a file from Azure Data Lake Storage."""
    lease_duration: Property[int] = Property.ofValue(-1)
    action: Property[LeaseAction] = Property.ofValue(LeaseAction.ACQUIRE)
    lease_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    class LeaseAction(str, Enum):
        ACQUIRE = "ACQUIRE"
        RENEW = "RENEW"
        RELEASE = "RELEASE"
        BREAK = "BREAK"

    @dataclass(slots=True)
    class Output:
        id: str | None = None
