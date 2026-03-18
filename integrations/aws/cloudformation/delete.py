from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\cloudformation\Delete.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.aws.cloudformation.abstract_cloud_formation import AbstractCloudFormation
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Delete(AbstractCloudFormation):
    """Delete a CloudFormation stack"""

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
