from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.shopify.abstract_shopify_task import AbstractShopifyTask
from integrations.shopify.models.customer import Customer
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractShopifyTask, RunnableTask):
    """Fetch Shopify customer by ID"""
    customer_id: Property[int]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        customer: Customer | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    customer: Customer | None = None
