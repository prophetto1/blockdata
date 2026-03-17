from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\monitoring\AbstractMonitoringTask.java
# WARNING: Unresolved types: IOException, MetricServiceClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractMonitoringTask(ABC, AbstractTask):

    def connection(self, run_context: RunContext) -> MetricServiceClient:
        raise NotImplementedError  # TODO: translate from Java
