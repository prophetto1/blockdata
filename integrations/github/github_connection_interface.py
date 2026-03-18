from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-github\src\main\java\io\kestra\plugin\github\GithubConnectionInterface.java
# WARNING: Unresolved types: GithubClientConfig

from typing import Any, Protocol

from integrations.github.github_connection import GithubConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


class GithubConnectionInterface(Protocol):
    def get_login(self) -> Property[str]: ...

    def get_oauth_token(self) -> Property[str]: ...

    def get_jwt_token(self) -> Property[str]: ...

    def get_repository(self) -> Property[str]: ...

    def get_client_config(self, run_context: RunContext) -> GithubConnection.GithubClientConfig: ...
