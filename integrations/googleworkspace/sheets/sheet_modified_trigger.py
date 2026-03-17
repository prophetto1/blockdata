from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\sheets\SheetModifiedTrigger.java
# WARNING: Unresolved types: Exception, On, Sheets, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any, Optional

from integrations.googleworkspace.sheets.abstract_sheet_trigger import AbstractSheetTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class SheetModifiedTrigger(AbstractSheetTrigger):
    """Poll for Google Sheet modifications"""
    spreadsheet_id: Property[str]
    interval: timedelta = Duration.ofMinutes(5)
    include_details: Property[bool] = Property.ofValue(false)
    on: Property[On] = Property.ofValue(On.CREATE_OR_UPDATE)
    sheet_name: Property[str] | None = None
    range: Property[str] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_change_details(self, sheets: Sheets, r_spreadsheet_id: str, final_r_sheet_name: str, final_range: str, run_context: RunContext) -> ChangeDetails:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        modifications: list[ModificationOutput] | None = None
        count: int | None = None

    @dataclass(slots=True)
    class ModificationOutput:
        revision_id: str | None = None
        modified_time: datetime | None = None
        spreadsheet_title: str | None = None
        spreadsheet_id: str | None = None
        last_modifying_user: str | None = None
        sheet_name: str | None = None
        change_details: ChangeDetails | None = None

    @dataclass(slots=True)
    class ChangeDetails:
        affected_range: str | None = None
        row_count: int | None = None
        column_count: int | None = None
        has_data: bool | None = None
