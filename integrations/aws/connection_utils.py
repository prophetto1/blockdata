from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\ConnectionUtils.java
# WARNING: Unresolved types: AwsAsyncClientBuilder, AwsClient, AwsClientBuilder, AwsClientConfig, AwsCredentialsProvider, AwsSyncClientBuilder, B, C, StaticCredentialsProvider, StsAssumeRoleCredentialsProvider, StsClient

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException


@dataclass(slots=True, kw_only=True)
class ConnectionUtils:

    @staticmethod
    def credentials_provider(aws_client_config: AbstractConnection.AwsClientConfig) -> AwsCredentialsProvider:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def static_credentials_provider(aws_client_config: AbstractConnection.AwsClientConfig) -> StaticCredentialsProvider:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def sts_assume_role_credentials_provider(aws_client_config: AbstractConnection.AwsClientConfig) -> StsAssumeRoleCredentialsProvider:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def sts_client(aws_client_config: AbstractConnection.AwsClientConfig) -> StsClient:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def configure_sync_client(client_config: AbstractConnection.AwsClientConfig, builder: B) -> B:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def configure_async_client(client_config: AbstractConnection.AwsClientConfig, builder: B) -> B:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def configure_async_client(max_concurrency: int, connection_acquisition_timeout: timedelta, client_config: AbstractConnection.AwsClientConfig, builder: B) -> B:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def configure_client(client_config: AbstractConnection.AwsClientConfig, builder: B) -> B:
        raise NotImplementedError  # TODO: translate from Java
