from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\GithubSearchTask.java
# WARNING: Unresolved types: GHObject, IOException, PagedSearchIterable, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.singer.taps.git_hub import GitHub
from integrations.github.github_connector import GithubConnector
from integrations.aws.glue.model.output import Output
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class GithubSearchTask(ABC, GithubConnector):

    def run(self, run_context: RunContext, items: PagedSearchIterable[Any], git_hub: GitHub) -> FileOutput:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_details(gh_object: GHObject, is_anonymous: bool) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class FileOutput:
        uri: str | None = None
