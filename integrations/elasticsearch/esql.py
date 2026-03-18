from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\Esql.java
# WARNING: Unresolved types: Exception, IOException, Pair, TypeReference, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.compress.abstract_task import AbstractTask
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Esql(AbstractTask):
    """Run ES|QL query"""
    query: Property[str]
    t_y_p_e__r_e_f_e_r_e_n_c_e: ClassVar[TypeReference[dict[str, Any]]] = new TypeReference<>() {}
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.FETCH)
    filter: Any | None = None

    def run(self, run_context: RunContext) -> Esql.Output:
        raise NotImplementedError  # TODO: translate from Java

    def store(self, run_context: RunContext, search_response: list[dict[str, Any]]) -> Pair[str, int]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch(self, search_response: list[dict[str, Any]]) -> Pair[list[dict[str, Any]], int]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_one(self, search_response: list[dict[str, Any]]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        size: int | None = None
        total: int | None = None
        rows: list[dict[str, Any]] | None = None
        row: dict[str, Any] | None = None
        uri: str | None = None
