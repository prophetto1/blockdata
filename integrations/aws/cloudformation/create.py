from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\cloudformation\Create.java
# WARNING: Unresolved types: Exception, Parameter, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.aws.cloudformation.abstract_cloud_formation import AbstractCloudFormation
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractCloudFormation):
    """Create or update a CloudFormation stack"""
    template_body: Property[str] | None = None
    parameters: Property[dict[str, str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def map_to_parameters(self, run_context: RunContext, params: dict[str, str]) -> list[Parameter]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        stack_id: str | None = None
        stack_name: str | None = None
        stack_outputs: dict[str, str] | None = None
