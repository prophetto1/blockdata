from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\ee\assets\List.java
# WARNING: Unresolved types: AssetsControllerApiAsset, Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.git.abstract_kestra_task import AbstractKestraTask
from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.kestra.ee.assets.field_query import FieldQuery
from engine.core.models.property.property import Property
from engine.core.models.query_filter import QueryFilter
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractKestraTask):
    """List assets with filters"""
    size: Property[int] = Property.ofValue(100)
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.STORE)
    page: Property[int] | None = None
    namespace: Property[str] | None = None
    types: Property[java.util.List[str]] | None = None
    metadata_query: Property[java.util.List[FieldQuery]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def to_query_filters(self, namespace: str, types_filter: java.util.List[str], metadata_query: java.util.List[FieldQuery]) -> java.util.List[QueryFilter]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        assets: java.util.List[AssetsControllerApiAsset] | None = None
        asset: AssetsControllerApiAsset | None = None
        uri: str | None = None
        size: int | None = None
