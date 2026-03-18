from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-typesense\src\main\java\io\kestra\plugin\typesense\Search.java
# WARNING: Unresolved types: Exception, IOException, SearchParameters, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.typesense.abstract_typesense_task import AbstractTypesenseTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.search_result import SearchResult


@dataclass(slots=True, kw_only=True)
class Search(AbstractTypesenseTask):
    """Search documents in Typesense"""
    query: Property[str]
    query_by: Property[str]
    filter: Property[str] | None = None
    sort_by: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_search_param(self, run_context: RunContext) -> SearchParameters:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def generate_output(run_context: RunContext, search_result: SearchResult) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        total_hits: int | None = None
