from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\configurations\AbstractAuthConfiguration.java
# WARNING: Unresolved types: HttpClientBuilder

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.http.client.configurations.basic_auth_configuration import BasicAuthConfiguration
from engine.core.http.client.configurations.bearer_auth_configuration import BearerAuthConfiguration
from engine.core.http.client.configurations.digest_auth_configuration import DigestAuthConfiguration
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractAuthConfiguration(ABC):

    @abstractmethod
    def get_type(self) -> AuthType:
        ...

    @abstractmethod
    def configure(self, builder: HttpClientBuilder, run_context: RunContext) -> None:
        ...

    class AuthType(str, Enum):
        BASIC = "BASIC"
        BEARER = "BEARER"
        DIGEST = "DIGEST"
