from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.stripe.abstract_stripe import AbstractStripe
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateIntent(AbstractStripe, RunnableTask):
    """Create a Stripe PaymentIntent"""
    amount: Property[int]
    currency: Property[str]
    customer: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        payment_intent_id: str | None = None
        status: str | None = None
        raw_response: dict[String, Object] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    payment_intent_id: str | None = None
    status: str | None = None
    raw_response: dict[String, Object] | None = None
