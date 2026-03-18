from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\Metric.java
# WARNING: Unresolved types: Meter, instrument, micrometer

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Metric:
    name: str | None = None
    type: str | None = None
    description: str | None = None
    base_unit: str | None = None
    tags: list[Tag] | None = None
    value: Any | None = None

    @staticmethod
    def of(meter: Meter) -> Metric:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Tag:
        key: str | None = None
        value: str | None = None

        @staticmethod
        def of(tag: io.micrometer.core.instrument.Tag) -> Tag:
            raise NotImplementedError  # TODO: translate from Java
