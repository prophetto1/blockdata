from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-shopify\src\main\java\io\kestra\plugin\shopify\customers\Get.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.shopify.abstract_shopify_task import AbstractShopifyTask
from integrations.shopify.models.customer import Customer
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractShopifyTask):
    """Fetch Shopify customer by ID"""
    customer_id: Property[int]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        customer: Customer | None = None
