from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\models\Cors.java
# WARNING: Unresolved types: cloud, com, google, storage

from dataclasses import dataclass
from enum import Enum
from typing import Any


@dataclass(slots=True, kw_only=True)
class Cors:
    max_age_seconds: int | None = None
    methods: list[HttpMethod] | None = None
    origins: list[com.google.cloud.storage.Cors.Origin] | None = None
    response_headers: list[str] | None = None

    @staticmethod
    def convert(cors: list[Cors]) -> list[com.google.cloud.storage.Cors]:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self) -> com.google.cloud.storage.Cors:
        raise NotImplementedError  # TODO: translate from Java

    class HttpMethod(str, Enum):
        GET = "GET"
        HEAD = "HEAD"
        PUT = "PUT"
        POST = "POST"
        DELETE = "DELETE"
        OPTIONS = "OPTIONS"

    @dataclass(slots=True)
    class Origin:
        value: str | None = None
