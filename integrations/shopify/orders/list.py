from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-shopify\src\main\java\io\kestra\plugin\shopify\orders\List.java
# WARNING: Unresolved types: Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.shopify.abstract_shopify_task import AbstractShopifyTask
from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.shopify.models.order import Order
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractShopifyTask):
    """List Shopify orders"""
    fetch_type: Property[FetchType] = Property.of(FetchType.FETCH)
    limit: Property[int] | None = None
    since_id: Property[int] | None = None
    status: Property[str] | None = None
    financial_status: Property[str] | None = None
    fulfillment_status: Property[str] | None = None
    created_at_min: Property[str] | None = None
    created_at_max: Property[str] | None = None
    updated_at_min: Property[str] | None = None
    updated_at_max: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        orders: java.util.List[Order] | None = None
        count: int | None = None
        uri: str | None = None
