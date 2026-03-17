from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\services\BlobService.java
# WARNING: Unresolved types: Action, BlobClient, BlobContainerClient, BlobItem, BlobProperties, BlobServiceClient, CopyObject, Exception, Filter, IOException, Pair

from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection_interface import AbstractConnectionInterface
from integrations.aws.s3.action_interface import ActionInterface
from integrations.azure.azure_client_with_sas_interface import AzureClientWithSasInterface
from integrations.azure.storage.blob.models.blob import Blob
from integrations.aws.s3.copy import Copy
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.s3.list_interface import ListInterface
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class BlobService:

    @staticmethod
    def download(run_context: RunContext, client: BlobClient) -> Pair[BlobProperties, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def archive(blobs_objects: list[Blob], action: ActionInterface.Action, move_to: Copy.CopyObject, run_context: RunContext, connection_interface: AbstractConnectionInterface, blob_storage_interface: AzureClientWithSasInterface) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def list(run_context: RunContext, client: BlobContainerClient, list: ListInterface) -> list[Blob]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def filter(object: BlobItem, reg_exp: str, filter: ListInterface.Filter) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def client(endpoint: str, connection_string: str, shared_key_account_name: str, shared_key_account_access_key: str, sas_token: str) -> BlobServiceClient:
        raise NotImplementedError  # TODO: translate from Java
