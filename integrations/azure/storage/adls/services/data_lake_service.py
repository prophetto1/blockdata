from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\adls\services\DataLakeService.java
# WARNING: Unresolved types: DataLakeFileClient, DataLakeFileSystemClient, DataLakeServiceClient, IOException

from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.adls.models.adls_file import AdlsFile
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class DataLakeService:

    @staticmethod
    def read(run_context: RunContext, client: DataLakeFileClient) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def list(file_system_client: DataLakeFileSystemClient, directory_path: str) -> list[AdlsFile]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def client(endpoint: str, connection_string: str, shared_key_account_name: str, shared_key_account_access_key: str, sas_token: str, run_context: RunContext) -> DataLakeServiceClient:
        raise NotImplementedError  # TODO: translate from Java
