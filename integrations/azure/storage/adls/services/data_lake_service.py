from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.adls.models.adls_file import AdlsFile
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class DataLakeService:

    def read(self, run_context: RunContext, client: DataLakeFileClient) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def list(self, file_system_client: DataLakeFileSystemClient, directory_path: str) -> list[AdlsFile]:
        raise NotImplementedError  # TODO: translate from Java

    def client(self, endpoint: str, connection_string: str, shared_key_account_name: str, shared_key_account_access_key: str, sas_token: str, run_context: RunContext) -> DataLakeServiceClient:
        raise NotImplementedError  # TODO: translate from Java
