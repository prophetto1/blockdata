from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.kestra.abstract_kestra_task import AbstractKestraTask
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class PurgeAssets(AbstractKestraTask, RunnableTask):
    """Purges assets from the catalog based on retention policies."""
    namespace: Property[str] | None = None
    asset_id: Property[str] | None = None
    asset_type: Property[list[String]] | None = None
    metadata_query: Property[java] | None = None
    end_date: Property[datetime]
    purge_assets: Property[bool]
    purge_asset_usages: Property[bool]
    purge_asset_lineages: Property[bool]

    def run(self, run_context: RunContext) -> PurgeOutput:
        raise NotImplementedError  # TODO: translate from Java

    def to_query_filters(self, asset_id: str, namespace: str, types_filter: java, metadata_query: java, end_date: datetime, id_field: QueryFilterField, date_field: QueryFilterField) -> java:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PurgeOutput(Output):
        purged_assets_count: int | None = None
        purged_asset_usages_count: int | None = None
        purged_asset_lineages_count: int | None = None


@dataclass(slots=True, kw_only=True)
class PurgeOutput(Output):
    purged_assets_count: int | None = None
    purged_asset_usages_count: int | None = None
    purged_asset_lineages_count: int | None = None
