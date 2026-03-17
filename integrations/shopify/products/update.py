from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.shopify.abstract_shopify_task import AbstractShopifyTask
from integrations.shopify.models.product import Product
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Update(AbstractShopifyTask, RunnableTask):
    """Update Shopify product fields"""
    product_id: Property[int] | None = None
    title: Property[str] | None = None
    body_html: Property[str] | None = None
    vendor: Property[str] | None = None
    product_type: Property[str] | None = None
    tags: Property[str] | None = None
    status: Property[str] | None = None
    handle: Property[str] | None = None
    template_suffix: Property[str] | None = None
    published_scope: Property[str] | None = None
    seo_title: Property[str] | None = None
    seo_description: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        product: Product | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    product: Product | None = None
