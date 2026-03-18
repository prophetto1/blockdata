from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\internal\Stats.java
# WARNING: Unresolved types: Logger

from dataclasses import dataclass
from typing import Any

from integrations.datagen.model.callback import Callback


@dataclass(slots=True, kw_only=True)
class Stats:
    start: int | None = None
    window_start: int | None = None
    latencies: list[int] | None = None
    sampling: int | None = None
    logger: Logger | None = None
    reporting_interval: int | None = None
    iteration: int | None = None
    index: int | None = None
    count: int | None = None
    bytes: int | None = None
    max_latency: int | None = None
    total_latency: int | None = None
    window_count: int | None = None
    window_max_latency: int | None = None
    window_total_latency: int | None = None
    window_bytes: int | None = None

    def record(self, iter: int, latency: int, bytes: int, time: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def next_completion(self, start: int, bytes: int, stats: Stats) -> Callback:
        raise NotImplementedError  # TODO: translate from Java

    def print_window(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def new_window(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def print_total(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def percentiles(latencies: list[int], count: int) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class StatsCallback:
        start: int | None = None
        iteration: int | None = None
        bytes: int | None = None
        stats: Stats | None = None

        def run(self) -> None:
            raise NotImplementedError  # TODO: translate from Java
