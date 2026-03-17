from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class LokiQueryResponse:
    status: str | None = None
    data: Data | None = None

    def to_log_entries(self) -> list[Map[String, Object]]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Data:
        result_type: str | None = None
        result: list[Result] | None = None

    @dataclass(slots=True)
    class Result:
        stream: dict[String, String] | None = None
        metric: dict[String, String] | None = None
        values: list[List[String]] | None = None
        value: list[String] | None = None


@dataclass(slots=True, kw_only=True)
class Data:
    result_type: str | None = None
    result: list[Result] | None = None


@dataclass(slots=True, kw_only=True)
class Result:
    stream: dict[String, String] | None = None
    metric: dict[String, String] | None = None
    values: list[List[String]] | None = None
    value: list[String] | None = None
