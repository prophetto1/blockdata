from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import date

from integrations.singer.taps.abstract_python_tap import AbstractPythonTap
from integrations.singer.models.feature import Feature
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class GoogleAnalytics(AbstractPythonTap, RunnableTask):
    """Fetch data from Google Adwords with a Singer tap."""
    service_account: Property[str] | None = None
    oauth_client_id: Property[str] | None = None
    oauth_client_secret: Property[str] | None = None
    oauth_access_token: Property[str] | None = None
    oauth_refresh_token: Property[str] | None = None
    view_id: Property[str] | None = None
    reports: list[Report] | None = None
    start_date: date
    end_date: date | None = None

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Report:
        name: str | None = None
        dimensions: list[String] | None = None
        metrics: list[String] | None = None


@dataclass(slots=True, kw_only=True)
class Report:
    name: str | None = None
    dimensions: list[String] | None = None
    metrics: list[String] | None = None
