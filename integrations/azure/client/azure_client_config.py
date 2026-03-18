from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\client\AzureClientConfig.java
# WARNING: Unresolved types: Supplier, T

from dataclasses import dataclass
from typing import Any, Optional

from integrations.azure.azure_client_with_sas_interface import AzureClientWithSasInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AzureClientConfig:
    run_context: RunContext | None = None
    plugin: T | None = None

    def connection_string(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def shared_key_account_name(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def shared_key_account_access_key(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def sas_token(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_optional_config(self, supplier: Supplier[Property[str]]) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java
