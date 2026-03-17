from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.kubernetes.abstract_connection import AbstractConnection


@dataclass(slots=True, kw_only=True)
class ConnectionUtils:

    def credentials_provider(self, aws_client_config: AbstractConnection) -> AwsCredentialsProvider:
        raise NotImplementedError  # TODO: translate from Java

    def static_credentials_provider(self, aws_client_config: AbstractConnection) -> StaticCredentialsProvider:
        raise NotImplementedError  # TODO: translate from Java

    def sts_assume_role_credentials_provider(self, aws_client_config: AbstractConnection) -> StsAssumeRoleCredentialsProvider:
        raise NotImplementedError  # TODO: translate from Java

    def sts_client(self, aws_client_config: AbstractConnection) -> StsClient:
        raise NotImplementedError  # TODO: translate from Java

    def configure_sync_client(self, client_config: AbstractConnection, builder: B) -> B:
        raise NotImplementedError  # TODO: translate from Java

    def configure_async_client(self, client_config: AbstractConnection, builder: B) -> B:
        raise NotImplementedError  # TODO: translate from Java

    def configure_async_client(self, max_concurrency: int, connection_acquisition_timeout: timedelta, client_config: AbstractConnection, builder: B) -> B:
        raise NotImplementedError  # TODO: translate from Java

    def configure_client(self, client_config: AbstractConnection, builder: B) -> B:
        raise NotImplementedError  # TODO: translate from Java
