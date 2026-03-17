from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\taps\Quickbooks.java

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
class Quickbooks(AbstractPythonTap):
    """Fetch data from a Quickbooks account with a Singer tap."""
    realm_id: str
    client_id: str
    client_secret: str
    refresh_token: str
    start_date: date
    select_fields_by_default: Property[bool] = Property.ofValue(true)
    is_sandbox: Property[bool] = Property.ofValue(false)
    state_message_threshold: Property[int] = Property.ofValue(1000)
    max_workers: Property[int] = Property.ofValue(8)

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java
