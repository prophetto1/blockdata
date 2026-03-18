from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\GithubConnector.java
# WARNING: Unresolved types: Exception, GithubClientConfig

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.singer.taps.git_hub import GitHub
from integrations.github.github_connection import GithubConnection
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class GithubConnector(ABC, GithubConnection):

    def connect(self, run_context: RunContext) -> GitHub:
        raise NotImplementedError  # TODO: translate from Java

    def connect(self, config: GithubClientConfig) -> GitHub:
        raise NotImplementedError  # TODO: translate from Java
