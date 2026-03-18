from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\auth\OauthAccessToken.java
# WARNING: Unresolved types: Date, Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.models.tasks.common.encrypted_string import EncryptedString
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class OauthAccessToken(AbstractTask):
    """Fetch a GCP OAuth access token."""

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        access_token: AccessTokenOutput

    @dataclass(slots=True)
    class AccessTokenOutput:
        scopes: list[str] | None = None
        token_value: EncryptedString | None = None
        expiration_time: Date | None = None
