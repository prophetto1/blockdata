from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\auth\OauthAccessToken.java
# WARNING: Unresolved types: Exception, OffsetDateTime, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.azure.abstract_azure_identity_connection import AbstractAzureIdentityConnection
from engine.core.models.tasks.common.encrypted_string import EncryptedString
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class OauthAccessToken(AbstractAzureIdentityConnection):
    """Request Azure AD access token"""
    scopes: Property[list[str]] = Property.ofValue(Collections.singletonList("https://management.azure.com/.default"))

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        access_token: AccessTokenOutput

    @dataclass(slots=True)
    class AccessTokenOutput:
        scopes: list[str] | None = None
        token_value: EncryptedString | None = None
        expiration_time: OffsetDateTime | None = None
