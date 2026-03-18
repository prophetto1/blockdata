from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-shopify\src\main\java\io\kestra\plugin\shopify\products\List.java
# WARNING: Unresolved types: Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.shopify.abstract_shopify_task import AbstractShopifyTask
from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.shopify.models.product import Product
from integrations.shopify.models.product_status import ProductStatus
from engine.core.models.property.property import Property
from integrations.shopify.models.published_status import PublishedStatus
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractShopifyTask):
    """List Shopify products"""
    fetch_type: Property[FetchType] = Property.of(FetchType.FETCH)
    limit: Property[int] | None = None
    since_id: Property[int] | None = None
    status: Property[ProductStatus] | None = None
    published_status: Property[PublishedStatus] | None = None
    product_type: Property[str] | None = None
    vendor: Property[str] | None = None
    handle: Property[str] | None = None
    created_at_min: Property[str] | None = None
    created_at_max: Property[str] | None = None
    updated_at_min: Property[str] | None = None
    updated_at_max: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        products: java.util.List[Product] | None = None
        count: int | None = None
        uri: str | None = None
