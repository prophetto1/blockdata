from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-grafana\src\main\java\io\kestra\plugin\grafana\loki\models\LokiQueryResponse.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class LokiQueryResponse:
    status: str | None = None
    data: Data | None = None

    def to_log_entries(self) -> list[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Data:
        result_type: str | None = None
        result: list[Result] | None = None

    @dataclass(slots=True)
    class Result:
        stream: dict[str, str] | None = None
        metric: dict[str, str] | None = None
        values: list[list[str]] | None = None
        value: list[str] | None = None
