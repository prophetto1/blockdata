from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\cloudformation\AbstractCloudFormation.java
# WARNING: Unresolved types: CloudFormationClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractCloudFormation(ABC, AbstractConnection):
    stack_name: Property[str]
    wait_for_completion: Property[bool] = Property.of(true)

    def cf_client(self, run_context: RunContext) -> CloudFormationClient:
        raise NotImplementedError  # TODO: translate from Java
