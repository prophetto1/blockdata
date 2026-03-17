from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.adls.abstracts.abstract_data_lake_with_file import AbstractDataLakeWithFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class SetAccessControl(AbstractDataLakeWithFile, RunnableTask):
    """Set access controls to a file in Azure Data Lake Storage."""
    group_permissions: Permission | None = None
    owner_permissions: Permission | None = None
    other_permissions: Permission | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Permission:
        read_permission: Property[bool] | None = None
        write_permission: Property[bool] | None = None
        execute_permission: Property[bool] | None = None


@dataclass(slots=True, kw_only=True)
class Permission:
    read_permission: Property[bool] | None = None
    write_permission: Property[bool] | None = None
    execute_permission: Property[bool] | None = None
