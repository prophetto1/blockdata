from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\MinioService.java
# WARNING: Unresolved types: Action, CopyObject, Exception, MinioAsyncClient, Pair

from dataclasses import dataclass
from typing import Any

from integrations.aws.s3.copy import Copy
from integrations.aws.s3.downloads import Downloads
from integrations.minio.minio_connection_interface import MinioConnectionInterface
from integrations.minio.model.minio_object import MinioObject
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class MinioService:

    @staticmethod
    def perform_action(run_context: RunContext, list: list[MinioObject], action: Downloads.Action, bucket: str, minio_connection: MinioConnectionInterface, move_to: Copy.CopyObject) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def download(run_context: RunContext, client: MinioAsyncClient, bucket: str, key: str, version_id: str) -> Pair[str, int]:
        raise NotImplementedError  # TODO: translate from Java
