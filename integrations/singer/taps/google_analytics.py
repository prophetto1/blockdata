from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\taps\GoogleAnalytics.java
# WARNING: Unresolved types: IOException

from dataclasses import dataclass
from datetime import date
from typing import Any

from integrations.singer.taps.abstract_python_tap import AbstractPythonTap
from integrations.singer.models.feature import Feature
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class GoogleAnalytics(AbstractPythonTap):
    """Fetch data from Google Adwords with a Singer tap."""
    start_date: date
    service_account: Property[str] | None = None
    oauth_client_id: Property[str] | None = None
    oauth_client_secret: Property[str] | None = None
    oauth_access_token: Property[str] | None = None
    oauth_refresh_token: Property[str] | None = None
    view_id: Property[str] | None = None
    reports: list[Report] | None = None
    end_date: date | None = None

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Report:
        name: str | None = None
        dimensions: list[str] | None = None
        metrics: list[str] | None = None
