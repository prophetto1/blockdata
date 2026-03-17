from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import date

from integrations.singer.taps.abstract_python_tap import AbstractPythonTap
from integrations.singer.models.feature import Feature
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Gitlab(AbstractPythonTap, RunnableTask):
    """Fetch data from a GitLab account with a Singer tap."""
    api_url: str
    private_token: str
    groups: Property[list[String]] | None = None
    projects: Property[list[String]] | None = None
    ultimate_license: Property[bool]
    fetch_merge_request_commits: Property[bool]
    fetch_pipelines_extended: Property[bool]
    start_date: date

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java
