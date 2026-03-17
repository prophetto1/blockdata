from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.singer.taps.git_hub import GitHub
from integrations.github.github_connection import GithubConnection
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class GithubConnector(GithubConnection):

    def connect(self, run_context: RunContext) -> GitHub:
        raise NotImplementedError  # TODO: translate from Java

    def connect(self, config: GithubClientConfig) -> GitHub:
        raise NotImplementedError  # TODO: translate from Java
