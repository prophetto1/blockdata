from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.prometheus.abstract_prometheus_task import AbstractPrometheusTask
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Push(AbstractPrometheusTask):
    """Push metrics to Prometheus Pushgateway"""
    url: Property[str]
    job: Property[str]
    instance: Property[str] | None = None
    metrics: Property[list[Metric]]

    def build_request(self, run_context: RunContext) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def format_metric(self, m: Metric) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def handle_response(self, run_context: RunContext, response: HttpResponse[String]) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Metric:
        name: str | None = None
        value: str | None = None
        labels: dict[String, String] | None = None

    @dataclass(slots=True)
    class Output(io):
        status: str | None = None
        code: int | None = None


@dataclass(slots=True, kw_only=True)
class Metric:
    name: str | None = None
    value: str | None = None
    labels: dict[String, String] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    status: str | None = None
    code: int | None = None
