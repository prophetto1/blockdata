from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\taps\AbstractPythonTap.java
# WARNING: Unresolved types: AtomicInteger, ConcurrentHashMap, Exception, IOException, OutputStream, Pair, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from integrations.singer.abstract_python_singer import AbstractPythonSinger
from integrations.singer.models.discover_streams import DiscoverStreams
from integrations.singer.models.feature import Feature
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.singer.models.streams_configuration import StreamsConfiguration


@dataclass(slots=True, kw_only=True)
class AbstractPythonTap(ABC, AbstractPythonSinger):
    streams_configurations: list[StreamsConfiguration]
    records_count: dict[str, AtomicInteger] = new ConcurrentHashMap<>()
    raw_singer_stream: Pair[Path, OutputStream] | None = None

    @abstractmethod
    def features(self) -> list[Feature]:
        ...

    def init_env_discovery_and_state(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def run_sync(self, run_context: RunContext) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def raw_data(self, raw: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def discover(self, run_context: RunContext, command: str) -> DiscoverStreams:
        raise NotImplementedError  # TODO: translate from Java

    def catalog_name(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def tap_command(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        raw: str | None = None
        count: int | None = None
