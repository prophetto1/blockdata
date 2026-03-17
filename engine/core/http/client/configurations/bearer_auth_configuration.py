from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\configurations\BearerAuthConfiguration.java
# WARNING: Unresolved types: AuthType, HttpClientBuilder

from dataclasses import dataclass
from typing import Any

from engine.core.http.client.configurations.abstract_auth_configuration import AbstractAuthConfiguration
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class BearerAuthConfiguration(AbstractAuthConfiguration):
    type: AuthType = AuthType.BEARER
    token: Property[str] | None = None

    def configure(self, builder: HttpClientBuilder, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
