from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\ee\assets\PurgeAssets.java
# WARNING: Unresolved types: Exception, QueryFilterField, java, util

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.git.abstract_kestra_task import AbstractKestraTask
from integrations.kestra.ee.assets.field_query import FieldQuery
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.models.query_filter import QueryFilter
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class PurgeAssets(AbstractKestraTask):
    """Purges assets from the catalog based on retention policies."""
    end_date: Property[datetime]
    purge_assets: Property[bool] = Property.ofValue(true)
    purge_asset_usages: Property[bool] = Property.ofValue(true)
    purge_asset_lineages: Property[bool] = Property.ofValue(true)
    namespace: Property[str] | None = None
    asset_id: Property[str] | None = None
    asset_type: Property[list[str]] | None = None
    metadata_query: Property[java.util.List[FieldQuery]] | None = None

    def run(self, run_context: RunContext) -> PurgeOutput:
        raise NotImplementedError  # TODO: translate from Java

    def to_query_filters(self, asset_id: str, namespace: str, types_filter: java.util.List[str], metadata_query: java.util.List[FieldQuery], end_date: datetime, id_field: QueryFilterField, date_field: QueryFilterField) -> java.util.List[QueryFilter]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PurgeOutput:
        purged_assets_count: int | None = None
        purged_asset_usages_count: int | None = None
        purged_asset_lineages_count: int | None = None
