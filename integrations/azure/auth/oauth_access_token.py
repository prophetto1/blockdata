from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.abstract_azure_identity_connection import AbstractAzureIdentityConnection
from engine.core.models.tasks.common.encrypted_string import EncryptedString
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class OauthAccessToken(AbstractAzureIdentityConnection, RunnableTask):
    """Request Azure AD access token"""
    scopes: Property[list[String]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        access_token: AccessTokenOutput

    @dataclass(slots=True)
    class AccessTokenOutput:
        scopes: list[String] | None = None
        token_value: EncryptedString | None = None
        expiration_time: OffsetDateTime | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    access_token: AccessTokenOutput


@dataclass(slots=True, kw_only=True)
class AccessTokenOutput:
    scopes: list[String] | None = None
    token_value: EncryptedString | None = None
    expiration_time: OffsetDateTime | None = None
