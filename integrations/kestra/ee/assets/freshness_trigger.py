from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\ee\assets\FreshnessTrigger.java
# WARNING: Unresolved types: Clock, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any, Optional

from integrations.kestra.abstract_kestra_trigger import AbstractKestraTrigger
from engine.core.models.assets.asset import Asset
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.kestra.ee.assets.field_query import FieldQuery
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.query_filter import QueryFilter
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class FreshnessTrigger(AbstractKestraTrigger):
    max_staleness: Property[timedelta]
    interval: timedelta = Duration.ofHours(1)
    clock: Clock = Clock.systemDefaultZone()
    asset_id: Property[str] | None = None
    namespace: Property[str] | None = None
    asset_type: Property[str] | None = None
    metadata_query: Property[list[FieldQuery]] | None = None

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
    class Output:
        assets: list[AssetWithStaleInfo] | None = None
