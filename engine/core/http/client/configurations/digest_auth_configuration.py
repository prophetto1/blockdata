from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\configurations\DigestAuthConfiguration.java
# WARNING: Unresolved types: AuthType, HttpClientBuilder

from dataclasses import dataclass
from typing import Any

from engine.core.http.client.configurations.abstract_auth_configuration import AbstractAuthConfiguration
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class DigestAuthConfiguration(AbstractAuthConfiguration):
    type: AuthType = AuthType.DIGEST
    username: Property[str] | None = None
    password: Property[str] | None = None

    def configure(self, builder: HttpClientBuilder, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
