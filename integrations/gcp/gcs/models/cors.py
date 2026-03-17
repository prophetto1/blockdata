from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class HttpMethod(str, Enum):
    GET = "GET"
    HEAD = "HEAD"
    PUT = "PUT"
    POST = "POST"
    DELETE = "DELETE"
    OPTIONS = "OPTIONS"


@dataclass(slots=True, kw_only=True)
class Cors:
    max_age_seconds: int | None = None
    methods: list[HttpMethod] | None = None
    origins: list[com] | None = None
    response_headers: list[String] | None = None

    def convert(self, cors: list[Cors]) -> list[com]:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self) -> com:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Origin:
        value: str | None = None


@dataclass(slots=True, kw_only=True)
class Origin:
    value: str | None = None
