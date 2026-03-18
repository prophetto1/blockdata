from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\flows\ExportById.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.git.abstract_kestra_task import AbstractKestraTask
from engine.webserver.controllers.domain.id_with_namespace import IdWithNamespace
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ExportById(AbstractKestraTask):
    """Export flows by id"""
    flows: Property[list[IdWithNamespace]] | None = None

    def run(self, run_context: RunContext) -> ExportById.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        flows_zip: str | None = None
