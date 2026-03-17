from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\configurations\AbstractAuthConfiguration.java
# WARNING: Unresolved types: HttpClientBuilder

from dataclasses import dataclass
from typing import Any

from engine.core.http.client.configurations.basic_auth_configuration import BasicAuthConfiguration
from engine.core.http.client.configurations.bearer_auth_configuration import BearerAuthConfiguration
from engine.core.http.client.configurations.digest_auth_configuration import DigestAuthConfiguration
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractAuthConfiguration:

    def get_type(self) -> AuthType:
        raise NotImplementedError  # TODO: translate from Java

    def configure(self, builder: HttpClientBuilder, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    class AuthType(str, Enum):
        BASIC = "BASIC"
        BEARER = "BEARER"
        DIGEST = "DIGEST"
