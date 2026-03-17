from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\mail\AbstractMail.java
# WARNING: Unresolved types: GeneralSecurityException, Gmail, HttpCredentialsAdapter, IOException, JsonFactory, NetHttpTransport

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.googleworkspace.o_auth_interface import OAuthInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractMail(ABC, Task):
    client_id: Property[str]
    client_secret: Property[str]
    refresh_token: Property[str]
    j_s_o_n__f_a_c_t_o_r_y: ClassVar[JsonFactory] = GsonFactory.getDefaultInstance()
    scopes: Property[list[str]] = Property.ofValue(List.of(
        GmailScopes.GMAIL_MODIFY,
        GmailScopes.GMAIL_READONLY,
        GmailScopes.GMAIL_SEND
    ))
    read_timeout: Property[int] = Property.ofValue(120)
    access_token: Property[str] | None = None

    def connection(self, run_context: RunContext) -> Gmail:
        raise NotImplementedError  # TODO: translate from Java

    def oauth_credentials(self, run_context: RunContext) -> HttpCredentialsAdapter:
        raise NotImplementedError  # TODO: translate from Java

    def net_http_transport(self) -> NetHttpTransport:
        raise NotImplementedError  # TODO: translate from Java
