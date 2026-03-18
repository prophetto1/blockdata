from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-shopify\src\main\java\io\kestra\plugin\shopify\customers\List.java
# WARNING: Unresolved types: Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.shopify.abstract_shopify_task import AbstractShopifyTask
from integrations.shopify.models.customer import Customer
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractShopifyTask):
    """List Shopify customers"""
    fetch_type: Property[FetchType] = Property.of(FetchType.FETCH)
    limit: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        customers: java.util.List[Customer] | None = None
        count: int | None = None
        uri: str | None = None
