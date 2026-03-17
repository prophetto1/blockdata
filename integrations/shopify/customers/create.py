from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.shopify.abstract_shopify_task import AbstractShopifyTask
from integrations.shopify.models.customer import Customer
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractShopifyTask, RunnableTask):
    """Create Shopify customer record"""
    email: Property[str]
    first_name: Property[str] | None = None
    last_name: Property[str] | None = None
    phone: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        customer: Customer | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    customer: Customer | None = None
