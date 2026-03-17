from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\AzureClientWithSasInterface.java

from typing import Any, Protocol

from integrations.azure.azure_client_interface import AzureClientInterface
from integrations.azure.azure_sas_token_interface import AzureSasTokenInterface


class AzureClientWithSasInterface(AzureClientInterface, AzureSasTokenInterface, Protocol):
    pass
