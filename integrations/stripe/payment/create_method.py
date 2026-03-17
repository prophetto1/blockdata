from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.stripe.abstract_stripe import AbstractStripe
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateMethod(AbstractStripe, RunnableTask):
    """Create a Stripe PaymentMethod"""
    payment_method_type: Property[str]
    card_number: Property[str] | None = None
    exp_month: Property[int] | None = None
    exp_year: Property[int] | None = None
    cvc: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        payment_method_id: str | None = None
        type: str | None = None
        raw_response: dict[String, Object] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    payment_method_id: str | None = None
    type: str | None = None
    raw_response: dict[String, Object] | None = None
