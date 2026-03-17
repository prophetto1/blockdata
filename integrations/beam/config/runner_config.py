from __future__ import annotations

from typing import Any, Protocol


class RunnerConfig(Protocol):
    def to_pipeline_options(self) -> dict[String, Object]: ...
