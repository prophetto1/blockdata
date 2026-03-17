from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.aws.cloudformation.abstract_cloud_formation import AbstractCloudFormation
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractCloudFormation, RunnableTask):
    """Create or update a CloudFormation stack"""
    template_body: Property[str] | None = None
    parameters: Property[dict[String, String]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def map_to_parameters(self, run_context: RunContext, params: dict[String, String]) -> list[Parameter]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        stack_id: str | None = None
        stack_name: str | None = None
        stack_outputs: dict[String, String] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    stack_id: str | None = None
    stack_name: str | None = None
    stack_outputs: dict[String, String] | None = None
