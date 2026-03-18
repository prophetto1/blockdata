from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\AbstractConnection.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.aws.abstract_connection_interface import AbstractConnectionInterface
from engine.core.models.property.property import Property
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractConnection(ABC, Task):
    sts_role_session_duration: Property[timedelta] = Property.ofValue(AbstractConnectionInterface.AWS_MIN_STS_ROLE_SESSION_DURATION)
    region: Property[str] | None = None
    endpoint_override: Property[str] | None = None
    compatibility_mode: Property[bool] | None = None
    force_path_style: Property[bool] | None = None
    access_key_id: Property[str] | None = None
    secret_key_id: Property[str] | None = None
    session_token: Property[str] | None = None
    sts_role_arn: Property[str] | None = None
    sts_role_external_id: Property[str] | None = None
    sts_role_session_name: Property[str] | None = None
    sts_endpoint_override: Property[str] | None = None

    @dataclass(slots=True)
    class AwsClientConfig:
        access_key_id: str | None = None
        secret_key_id: str | None = None
        session_token: str | None = None
        sts_role_arn: str | None = None
        sts_role_external_id: str | None = None
        sts_role_session_name: str | None = None
        sts_endpoint_override: str | None = None
        sts_role_session_duration: timedelta | None = None
        region: str | None = None
        endpoint_override: str | None = None
