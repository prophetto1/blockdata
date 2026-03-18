from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-stripe\src\main\java\io\kestra\plugin\stripe\payment\CreateIntent.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.stripe.abstract_stripe import AbstractStripe
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateIntent(AbstractStripe):
    """Create a Stripe PaymentIntent"""
    amount: Property[int]
    currency: Property[str]
    customer: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        payment_intent_id: str | None = None
        status: str | None = None
        raw_response: dict[str, Any] | None = None
