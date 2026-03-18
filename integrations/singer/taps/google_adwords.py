from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\taps\GoogleAdwords.java

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
class GoogleAdwords(AbstractPythonTap):
    """A Singer tap to fetch data from Google Adwords."""
    developer_token: str
    oauth_client_id: str
    oauth_client_secret: str
    refresh_token: str
    customer_ids: list[str]
    start_date: date
    conversion_window_days: Property[int] = Property.ofValue(0)
    user_agent: Property[str] = Property.ofValue("tap-adwords via Kestra")
    end_date: date | None = None
    primary_keys: dict[str, list[str]] | None = None

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java
