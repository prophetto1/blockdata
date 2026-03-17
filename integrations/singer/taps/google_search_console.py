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
class GoogleSearchConsole(AbstractPythonTap, RunnableTask):
    """Fetch data from the Google Search console with a Singer tap."""
    client_id: str
    client_secret: str
    refresh_token: str
    site_urls: list[String]
    start_date: date
    user_agent: Property[str] | None = None

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java
