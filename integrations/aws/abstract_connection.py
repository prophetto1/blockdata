from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.azure.abstract_connection_interface import AbstractConnectionInterface
from engine.core.models.property.property import Property
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractConnection(Task, AbstractConnectionInterface):
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
    sts_role_session_duration: Property[timedelta] | None = None
