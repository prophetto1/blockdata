from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pipedrive\src\main\java\io\kestra\plugin\pipedrive\persons\Get.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.pipedrive.abstract_pipedrive_task import AbstractPipedriveTask
from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.pipedrive.models.person import Person
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractPipedriveTask):
    """Get a person from Pipedrive CRM"""
    person_id: Property[int]
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.FETCH_ONE)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        person: Person | None = None
        persons: list[Person] | None = None
        uri: str | None = None
        count: int | None = None
