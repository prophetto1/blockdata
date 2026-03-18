from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\config\BlobContainerClientConfig.java

from dataclasses import dataclass
from typing import Any

from integrations.azure.client.azure_client_config import AzureClientConfig
from integrations.azure.eventhubs.blob_container_client_interface import BlobContainerClientInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class BlobContainerClientConfig(AzureClientConfig):

    def container_name(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
