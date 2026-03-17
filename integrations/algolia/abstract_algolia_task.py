from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-algolia\src\main\java\io\kestra\plugin\algolia\AbstractAlgoliaTask.java
# WARNING: Unresolved types: Exception, SearchClient, T, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractAlgoliaTask(ABC, Task):
    application_id: Property[str]
    api_key: Property[str]

    def client(self, run_context: RunContext) -> SearchClient:
        raise NotImplementedError  # TODO: translate from Java
