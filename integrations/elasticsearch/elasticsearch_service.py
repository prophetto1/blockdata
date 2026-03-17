from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\ElasticsearchService.java
# WARNING: Unresolved types: IOException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class ElasticsearchService(ABC):

    @staticmethod
    def to_body(run_context: RunContext, value: Any) -> str:
        raise NotImplementedError  # TODO: translate from Java
