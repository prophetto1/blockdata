from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.aws.cloudformation.abstract_cloud_formation import AbstractCloudFormation
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Delete(AbstractCloudFormation, RunnableTask):
    """Delete a CloudFormation stack"""

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
