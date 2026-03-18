from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\taps\ChargeBee.java

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
class ChargeBee(AbstractPythonTap):
    """Fetch data from a ChargeBee account with a Singer tap."""
    api_key: str
    site: str
    start_date: date
    product_catalog: str = "1.0"

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java
