from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-stripe\src\main\java\io\kestra\plugin\stripe\payment\ListIntents.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.stripe.abstract_stripe import AbstractStripe
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ListIntents(AbstractStripe):
    """List Stripe PaymentIntents"""
    limit: Property[int] | None = None
    customer: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int | None = None
        payment_intents: list[dict[str, Any]] | None = None
