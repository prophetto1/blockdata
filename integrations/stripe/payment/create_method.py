from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-stripe\src\main\java\io\kestra\plugin\stripe\payment\CreateMethod.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.stripe.abstract_stripe import AbstractStripe
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateMethod(AbstractStripe):
    """Create a Stripe PaymentMethod"""
    payment_method_type: Property[str]
    card_number: Property[str] | None = None
    exp_month: Property[int] | None = None
    exp_year: Property[int] | None = None
    cvc: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        payment_method_id: str | None = None
        type: str | None = None
        raw_response: dict[str, Any] | None = None
