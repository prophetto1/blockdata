from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-prometheus\src\main\java\io\kestra\plugin\prometheus\Push.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.prometheus.abstract_prometheus_task import AbstractPrometheusTask
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Push(AbstractPrometheusTask):
    """Push metrics to Prometheus Pushgateway"""
    job: Property[str]
    metrics: Property[list[Metric]]
    url: Property[str] = Property.ofValue("http://localhost:9091")
    instance: Property[str] | None = None

    def build_request(self, run_context: RunContext) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def format_metric(self, m: Metric) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def handle_response(self, run_context: RunContext, response: HttpResponse[str]) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Metric:
        name: str | None = None
        value: str | None = None
        labels: dict[str, str] | None = None

    @dataclass(slots=True)
    class Output:
        status: str | None = None
        code: int | None = None
