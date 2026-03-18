from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\models\BlobStorageForBatch.java
# WARNING: Unresolved types: BlobContainerClient

from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection_interface import AbstractConnectionInterface
from integrations.azure.azure_client_interface import AzureClientInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class BlobStorageForBatch:
    container_name: Property[str]
    endpoint: Property[str] | None = None
    connection_string: Property[str] | None = None
    shared_key_account_name: Property[str] | None = None
    shared_key_account_access_key: Property[str] | None = None

    def valid(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def blob_container_client(self, run_context: RunContext) -> BlobContainerClient:
        raise NotImplementedError  # TODO: translate from Java
