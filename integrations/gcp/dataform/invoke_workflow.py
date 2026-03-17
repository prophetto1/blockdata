from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\dataform\InvokeWorkflow.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.gcp.dataform.abstract_data_form import AbstractDataForm
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class InvokeWorkflow(AbstractDataForm):
    """Invoke a Dataform workflow in GCP"""
    workflow_config_id: Property[str]
    wait: bool = True

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        workflow_invocation_name: str | None = None
        workflow_invocation_state: str | None = None
