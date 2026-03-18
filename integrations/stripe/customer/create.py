from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-stripe\src\main\java\io\kestra\plugin\stripe\customer\Create.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.stripe.abstract_stripe import AbstractStripe
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractStripe):
    """Create Stripe customer record"""
    name: Property[str]
    email: Property[str]
    include_full_customer_data: Property[bool] = Property.of(false)
    metadata: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        customer_id: str | None = None
        customer_data: dict[str, Any] | None = None
