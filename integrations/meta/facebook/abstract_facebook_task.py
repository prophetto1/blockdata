from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meta\src\main\java\io\kestra\plugin\meta\facebook\AbstractFacebookTask.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractFacebookTask(ABC, Task):
    page_id: Property[str]
    access_token: Property[str]
    api_version: Property[str] = Property.ofValue("v24.0")
    api_base_url: Property[str] = Property.ofValue("https://graph.facebook.com")

    def build_api_url(self, run_context: RunContext, endpoint: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
