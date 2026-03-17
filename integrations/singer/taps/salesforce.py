from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from datetime import date

from integrations.singer.taps.abstract_python_tap import AbstractPythonTap
from integrations.singer.models.feature import Feature
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class ApiType(str, Enum):
    REST = "REST"
    BULK = "BULK"


@dataclass(slots=True, kw_only=True)
class Salesforce(AbstractPythonTap, RunnableTask):
    """Fetch data from a Salesforce account with a Singer tap."""
    api_type: Property[ApiType]
    select_fields_by_default: Property[bool]
    is_sandbox: Property[bool]
    client_id: Property[str] | None = None
    client_secret: Property[str] | None = None
    refresh_token: Property[str] | None = None
    lookback_window: Property[int] | None = None
    start_date: date

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java
