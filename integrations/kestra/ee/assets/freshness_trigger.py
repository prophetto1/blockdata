from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from datetime import timedelta

from integrations.kestra.abstract_kestra_trigger import AbstractKestraTrigger
from engine.core.models.assets.asset import Asset
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.kestra.ee.assets.field_query import FieldQuery
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.query_filter import QueryFilter
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class FreshnessTrigger(AbstractKestraTrigger, PollingTriggerInterface, TriggerOutput):
    asset_id: Property[str] | None = None
    namespace: Property[str] | None = None
    asset_type: Property[str] | None = None
    max_staleness: Property[timedelta]
    interval: timedelta | None = None
    metadata_query: Property[list[FieldQuery]] | None = None
    clock: Clock | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def to_query_filters(self, asset_id: str, namespace: str, type_filter: str, metadata_query: list[FieldQuery], updated_before: datetime) -> list[QueryFilter]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class AssetWithStaleInfo(Asset):
        stale_duration: timedelta | None = None
        check_time: datetime | None = None

        def get_updated(self) -> datetime:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        assets: list[AssetWithStaleInfo] | None = None


@dataclass(slots=True, kw_only=True)
class AssetWithStaleInfo(Asset):
    stale_duration: timedelta | None = None
    check_time: datetime | None = None

    def get_updated(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    assets: list[AssetWithStaleInfo] | None = None
