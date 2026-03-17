from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-stripe\src\main\java\io\kestra\plugin\stripe\AbstractStripe.java
# WARNING: Unresolved types: StripeClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.stripe.stripe_interface import StripeInterface
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractStripe(ABC, Task):
    api_key: Property[str]

    def client(self, run_context: RunContext) -> StripeClient:
        raise NotImplementedError  # TODO: translate from Java
