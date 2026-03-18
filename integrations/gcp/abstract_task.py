from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\AbstractTask.java
# WARNING: Unresolved types: GoogleCredentials, IOException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.gcp.gcp_interface import GcpInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(ABC, Task):
    scopes: Property[list[str]] = Property.ofValue(Collections.singletonList("https://www.googleapis.com/auth/cloud-platform"))
    project_id: Property[str] | None = None
    service_account: Property[str] | None = None
    impersonated_service_account: Property[str] | None = None

    def credentials(self, run_context: RunContext) -> GoogleCredentials:
        raise NotImplementedError  # TODO: translate from Java
