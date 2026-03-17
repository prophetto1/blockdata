from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-prometheus\src\main\java\io\kestra\plugin\prometheus\Query.java
# WARNING: Unresolved types: Exception, JsonNode, ObjectMapper, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from integrations.prometheus.abstract_prometheus_task import AbstractPrometheusTask
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Query(AbstractPrometheusTask):
    """Run PromQL query against Prometheus"""
    query: Property[str]
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    url: Property[str] = Property.ofValue("http://localhost:9090")
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.NONE)
    time: Property[str] | None = None

    def build_request(self, run_context: RunContext) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def handle_response(self, run_context: RunContext, response: HttpResponse[str]) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def handle_fetch_type(self, run_context: RunContext, metrics: list[PrometheusMetric], result_type: ResultType) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def store_results(self, run_context: RunContext, metrics: list[PrometheusMetric]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def parse_vector(self, result: JsonNode) -> list[PrometheusMetric]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_matrix(self, result: JsonNode) -> list[PrometheusMetric]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_scalar(self, result: JsonNode) -> list[PrometheusMetric]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_string(self, result: JsonNode) -> list[PrometheusMetric]:
        raise NotImplementedError  # TODO: translate from Java

    def extract_labels(self, metric: JsonNode) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    class ResultType(str, Enum):
        VECTOR = "VECTOR"
        MATRIX = "MATRIX"
        SCALAR = "SCALAR"
        STRING = "STRING"

    @dataclass(slots=True)
    class Output:
        size: int | None = None
        total: int | None = None
        metrics: list[PrometheusMetric] | None = None
        metric: PrometheusMetric | None = None
        uri: str | None = None
        result_type: str | None = None

    @dataclass(slots=True)
    class PrometheusMetric:
        labels: dict[str, str] | None = None
        timestamp: float | None = None
        value: str | None = None
