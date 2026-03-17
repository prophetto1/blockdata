from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-shopify\src\main\java\io\kestra\plugin\shopify\customers\Delete.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.shopify.abstract_shopify_task import AbstractShopifyTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Delete(AbstractShopifyTask):
    """Delete Shopify customer by ID"""
    customer_id: Property[int]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
