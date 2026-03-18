from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\SolaceConnectionInterface.java

from typing import Any, Protocol

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property


class SolaceConnectionInterface(Protocol):
    def get_username(self) -> Property[str]: ...

    def get_password(self) -> Property[str]: ...

    def get_vpn(self) -> Property[str]: ...

    def get_host(self) -> Property[str]: ...

    def get_properties(self) -> Property[dict[str, str]]: ...
